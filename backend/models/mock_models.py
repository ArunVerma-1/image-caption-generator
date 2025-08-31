import numpy as np
import time
import random
import logging
from PIL import Image

logger = logging.getLogger(__name__)

class MockFeatureExtractor:
    def __init__(self):
        self.target_size = (299, 299)
        logger.info("Mock Feature Extractor initialized")
    
    def extract_features(self, img_path):
        try:
            with Image.open(img_path) as img:
                width, height = img.size
                seed = hash(f"{width}x{height}") % 10000
            
            time.sleep(0.1)
            np.random.seed(seed)
            features = np.random.normal(0.5, 0.15, 2048)
            features = np.clip(features, 0, 1)
            return features.astype(np.float32)
        except:
            return np.random.random(2048).astype(np.float32)

class MockCaptionGenerator:
    def __init__(self, model_path=None, tokenizer_path=None):
        self.vocab_size = 8547
        self.max_length = 40
        
        self.captions = {
            'nature': [
                "a beautiful landscape with mountains in the background",
                "trees and grass in a natural outdoor setting",
                "a scenic view of nature with clear blue sky"
            ],
            'people': [
                "a group of people gathered together in a social setting",
                "people enjoying time together in a friendly environment",
                "individuals engaged in conversation"
            ],
            'urban': [
                "a busy city street with buildings and infrastructure",
                "modern architecture in an urban environment",
                "tall buildings in a cityscape"
            ],
            'indoor': [
                "an indoor space with furniture and decorations",
                "a well-lit interior room with various objects",
                "comfortable indoor environment"
            ],
            'objects': [
                "various objects arranged in an organized manner",
                "everyday items placed on a surface",
                "a collection of useful objects"
            ],
            'animals': [
                "a domestic animal in a comfortable environment",
                "a pet showing natural behavior",
                "an animal in its habitat"
            ]
        }
        
        logger.info("Mock Caption Generator initialized")
    
    def _get_category(self, features):
        mean_val = np.mean(features)
        if mean_val < 0.3: return 'nature'
        elif mean_val < 0.45: return 'animals'  
        elif mean_val < 0.6: return 'people'
        elif mean_val < 0.75: return 'urban'
        elif mean_val < 0.85: return 'indoor'
        else: return 'objects'
    
    def generate_caption_greedy(self, image_features):
        category = self._get_category(image_features)
        caption = random.choice(self.captions[category])
        
        if random.random() < 0.3:
            modifiers = ['bright', 'colorful', 'peaceful', 'modern']
            caption = f"{random.choice(modifiers)} {caption}"
        
        return caption
    
    def generate_caption_beam_search(self, image_features, beam_width=3):
        category = self._get_category(image_features)
        captions = self.captions[category]
        
        enhanced = {
            'nature': [
                "breathtaking natural landscape with majestic mountains and lush greenery",
                "serene outdoor scenery with pristine beauty and peaceful atmosphere"
            ],
            'people': [
                "vibrant gathering of people enjoying meaningful social connections",
                "diverse group engaged in lively conversation and interaction"
            ],
            'urban': [
                "dynamic urban environment with impressive architectural design",
                "bustling metropolitan area with modern buildings and street life"
            ],
            'indoor': [
                "elegantly designed indoor space with comfortable furnishings",
                "well-appointed interior room with harmonious design elements"
            ],
            'objects': [
                "carefully arranged collection of practical items and objects",
                "assorted objects organized in a functional manner"
            ],
            'animals': [
                "adorable animal displaying natural charm and characteristics",
                "beloved pet in a nurturing and appropriate environment"
            ]
        }
        
        all_captions = captions + enhanced.get(category, [])
        return random.choice(all_captions)
    
    def get_confidence_score(self, image_features, caption_words):
        base_confidence = 0.72
        word_count = len(caption_words)
        
        word_bonus = 0.15 if 8 <= word_count <= 15 else 0.05
        random_factor = random.uniform(-0.03, 0.05)
        
        final_confidence = base_confidence + word_bonus + random_factor
        return max(0.60, min(0.94, final_confidence))