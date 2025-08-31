import os
import sys
import logging
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from PIL import Image
import io
import tempfile
import uvicorn
import traceback
from contextlib import asynccontextmanager
import gc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Enhanced Image Caption Generator API")
    await load_models()
    yield
    logger.info("🛑 Shutting down API")
    models.clear()
    gc.collect()

app = FastAPI(
    title="Enhanced Image Caption Generator API",
    description="Production AI-powered image captioning service",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://captionit-beta.vercel.app/"
        "https://*.vercel.app",
        "https://vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)

def get_config():
    return {
        "model_path": os.getenv("MODEL_PATH", "models/best_model.h5"),
        "tokenizer_path": os.getenv("TOKENIZER_PATH", "models/tokenizer.pkl"),
        "max_file_size": int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024,
        "max_batch_size": int(os.getenv("MAX_BATCH_SIZE", "3")),
        "allowed_extensions": os.getenv("ALLOWED_EXTENSIONS", "jpg,jpeg,png,bmp,gif").split(","),
    }

async def load_models():
    global models
    config = get_config()
    
    try:
        logger.info("📦 Loading models...")
        
        if os.path.exists(config["model_path"]) and os.path.exists(config["tokenizer_path"]):
            try:
                from models.feature_extractor import FeatureExtractor
                from models.caption_generator import CaptionGenerator
                
                models["feature_extractor"] = FeatureExtractor()
                models["caption_generator"] = CaptionGenerator(
                    config["model_path"], 
                    config["tokenizer_path"]
                )
                models["status"] = "production"
                logger.info("✅ Production models loaded")
            except Exception as e:
                logger.error(f"Failed to load production models: {e}")
                raise
        else:
            from models.mock_models import MockFeatureExtractor, MockCaptionGenerator
            models["feature_extractor"] = MockFeatureExtractor()
            models["caption_generator"] = MockCaptionGenerator()
            models["status"] = "mock"
            logger.info("✅ Mock models loaded")
            
    except Exception as e:
        logger.error(f"Critical error: {e}")
        from models.mock_models import MockFeatureExtractor, MockCaptionGenerator
        models["feature_extractor"] = MockFeatureExtractor()
        models["caption_generator"] = MockCaptionGenerator()
        models["status"] = "fallback"

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "detail": str(exc)}
    )

@app.get("/", response_class=HTMLResponse)
async def root():
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Enhanced Image Caption Generator API</title>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .status {{ padding: 15px; border-radius: 8px; margin: 20px 0; }}
            .mock {{ background: #4facfe; color: white; }}
        </style>
    </head>
    <body>
        <h1>🖼️ Enhanced Image Caption Generator API</h1>
        <div class="status {models.get('status', 'unknown')}">
            <h3>Status: {models.get('status', 'Unknown').upper()} MODE</h3>
            <p>{'Production AI models active' if models.get('status') == 'production' else 'Demo models active'}</p>
        </div>
        <p><a href="/docs" target="_blank">📖 API Documentation</a></p>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": models.get("feature_extractor") is not None,
        "model_mode": models.get("status", "unknown"),
        "api_version": "2.0.0"
    }

@app.post("/generate-caption")
async def generate_caption(
    file: UploadFile = File(...),
    method: str = "beam_search",
    beam_width: int = 3
):
    config = get_config()
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    if method not in ["beam_search", "greedy_search"]:
        raise HTTPException(status_code=400, detail="Invalid method")
    
    temp_path = None
    try:
        file_data = await file.read()
        
        if len(file_data) > config["max_file_size"]:
            raise HTTPException(status_code=413, detail="File too large")
        
        image = Image.open(io.BytesIO(file_data))
        
        if image.mode != 'RGB':
            if image.mode == 'RGBA':
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1])
                image = background
            else:
                image = image.convert('RGB')
        
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            image.save(temp_file.name, 'JPEG', quality=95)
            temp_path = temp_file.name
        
        features = models["feature_extractor"].extract_features(temp_path)
        
        if method == "beam_search":
            caption = models["caption_generator"].generate_caption_beam_search(
                features, beam_width=beam_width
            )
        else:
            caption = models["caption_generator"].generate_caption_greedy(features)
        
        caption_words = caption.split()
        confidence = models["caption_generator"].get_confidence_score(features, caption_words)
        
        return JSONResponse({
            "success": True,
            "caption": caption.title(),
            "confidence_score": round(float(confidence), 3),
            "method_used": method,
            "word_count": len(caption_words),
            "image_dimensions": list(image.size),
            "filename": file.filename,
            "model_mode": models.get("status", "unknown")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except:
                pass

@app.post("/batch-generate")
async def batch_generate_captions(files: List[UploadFile] = File(...)):
    config = get_config()
    
    if len(files) > config["max_batch_size"]:
        raise HTTPException(status_code=400, detail=f"Max {config['max_batch_size']} files allowed")
    
    results = []
    successful_count = 0
    temp_files = []
    
    try:
        for i, file in enumerate(files, 1):
            temp_path = None
            try:
                if not file.content_type.startswith("image/"):
                    results.append({
                        "filename": file.filename,
                        "success": False,
                        "error": "Invalid file type"
                    })
                    continue
                
                file_data = await file.read()
                image = Image.open(io.BytesIO(file_data))
                
                if image.mode != 'RGB':
                    if image.mode == 'RGBA':
                        background = Image.new('RGB', image.size, (255, 255, 255))
                        background.paste(image, mask=image.split()[-1])
                        image = background
                    else:
                        image = image.convert('RGB')
                
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                    image.save(temp_file.name, 'JPEG', quality=95)
                    temp_path = temp_file.name
                temp_files.append(temp_path)
                
                features = models["feature_extractor"].extract_features(temp_path)
                caption = models["caption_generator"].generate_caption_beam_search(features)
                
                results.append({
                    "filename": file.filename,
                    "success": True,
                    "caption": caption.title(),
                    "image_dimensions": list(image.size)
                })
                successful_count += 1
                
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })
        
        return JSONResponse({
            "success": True,
            "results": results,
            "summary": {
                "total_processed": len(files),
                "successful": successful_count,
                "failed": len(files) - successful_count,
                "model_mode": models.get("status", "unknown")
            }
        })
        
    finally:
        for temp_path in temp_files:
            try:
                os.unlink(temp_path)
            except:
                pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)