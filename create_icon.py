from PIL import Image, ImageDraw
import os

def create_weather_icon():
    # Create a new image with a transparent background
    size = 192
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Draw a sun (yellow circle)
    sun_color = (255, 193, 7)  # Yellow
    draw.ellipse([size//4, size//4, 3*size//4, 3*size//4], fill=sun_color)
    
    # Draw a cloud (white rounded rectangle)
    cloud_color = (255, 255, 255)  # White
    draw.ellipse([size//3, size//2, 2*size//3, 5*size//6], fill=cloud_color)
    draw.ellipse([size//2, size//2, 5*size//6, 5*size//6], fill=cloud_color)
    draw.rectangle([size//3 + size//6, size//2, 5*size//6, 5*size//6], fill=cloud_color)
    
    # Create the images directory if it doesn't exist
    os.makedirs('static/images', exist_ok=True)
    
    # Save the icon
    icon_path = 'static/images/weather-icon.png'
    image.save(icon_path)
    print(f"Icon created at {icon_path}")

if __name__ == "__main__":
    create_weather_icon() 