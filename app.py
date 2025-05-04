from flask import Flask, request, jsonify, render_template, send_from_directory
from PIL import Image, ImageStat
import numpy as np
import requests
import io
import os
import random
from datetime import datetime
import json

app = Flask(__name__, static_folder='static', template_folder='templates')

# Create necessary folders
UPLOAD_FOLDER = os.path.join('static', 'uploads')
RANDOM_PICS_FOLDER = os.path.join('static', 'weather_pics')
COMMUNITY_PICS_FOLDER = os.path.join('static', 'community_pics')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RANDOM_PICS_FOLDER, exist_ok=True)
os.makedirs(COMMUNITY_PICS_FOLDER, exist_ok=True)

# OpenWeather API Key (Replace with your own)
API_KEY = "YOUR_API_KEY_HERE"  # Replace this with your actual API key

# Weather sounds mapping
WEATHER_SOUNDS = {
    'Clear Sky': 'sunny.mp3',
    'Cloudy': 'cloudy.mp3',
    'Rain': 'rain.mp3',
    'Thunderstorm': 'thunder.mp3',
    'Snow': 'snow.mp3',
    'Windy': 'wind.mp3'
}

def analyze_image_colors(image):
    """
    Analyze image colors to determine weather conditions
    """
    # Convert to RGB if not already
    image = image.convert('RGB')
    
    # Get image statistics
    stat = ImageStat.Stat(image)
    r, g, b = stat.mean
    brightness = sum([r, g, b]) / 3
    
    # Calculate sky color dominance
    blue_dominance = b - ((r + g) / 2)
    gray_level = abs(r - g) + abs(g - b) + abs(b - r)
    
    # Weather detection logic
    if brightness > 200 and blue_dominance > 20:
        return "Clear Sky"
    elif brightness > 180 and gray_level < 20:
        return "Cloudy"
    elif brightness < 100:
        return "Stormy"
    elif blue_dominance > 10:
        return "Partly Cloudy"
    else:
        return "Overcast"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400
    
    try:
        # Read and process the image
        image_data = file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Save the uploaded file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"weather_{timestamp}.jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        image.save(filepath)
        
        # Analyze the weather
        weather_condition = analyze_image_colors(image)
        
        return jsonify({
            "success": True,
            "predicted_weather": weather_condition,
            "image_url": f"/static/uploads/{filename}"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/random-weather-pic')
def random_weather_pic():
    """
    Return a random weather picture from the collection.
    """
    try:
        # Get list of weather pictures
        weather_pics = [f for f in os.listdir(RANDOM_PICS_FOLDER) if f.endswith(('.jpg', '.png', '.jpeg'))]
        
        if not weather_pics:
            return jsonify({"error": "No weather pictures available"}), 404
        
        # Select random picture
        random_pic = random.choice(weather_pics)
        pic_path = os.path.join(RANDOM_PICS_FOLDER, random_pic)
        
        # Open and analyze the image
        with Image.open(pic_path) as image:
            weather_condition = analyze_image_colors(image)
        
        return jsonify({
            "image_url": f"/static/weather_pics/{random_pic}",
            "predicted_weather": weather_condition
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/share-photo', methods=['POST'])
def share_photo():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    try:
        file = request.files['file']
        location = request.form.get('location', 'Unknown Location')
        description = request.form.get('description', '')
        
        # Save the image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"community_{timestamp}.jpg"
        filepath = os.path.join(COMMUNITY_PICS_FOLDER, filename)
        
        # Process and save image
        image = Image.open(file)
        image.save(filepath)
        
        # Analyze weather
        weather_condition = analyze_image_colors(image)
        
        # Create metadata
        metadata = {
            'id': timestamp,
            'filename': filename,
            'location': location,
            'description': description,
            'weather': weather_condition,
            'timestamp': timestamp
        }
        
        # Save metadata
        metadata_file = os.path.join(COMMUNITY_PICS_FOLDER, 'metadata.json')
        try:
            with open(metadata_file, 'r') as f:
                all_metadata = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            all_metadata = []
            
        all_metadata.append(metadata)
        with open(metadata_file, 'w') as f:
            json.dump(all_metadata, f)
        
        return jsonify({
            "success": True,
            "image_url": f"/static/community_pics/{filename}",
            "weather": weather_condition
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/community-photos')
def get_community_photos():
    metadata_file = os.path.join(COMMUNITY_PICS_FOLDER, 'metadata.json')
    try:
        with open(metadata_file, 'r') as f:
            photos = json.load(f)
        return jsonify(photos)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify([])

if __name__ == '__main__':
    app.run(debug=True)
