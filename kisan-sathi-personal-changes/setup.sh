#!/bin/bash

# KISAN Setup Script
# This script sets up the entire project with backend and frontend

echo "🌾 KISAN - Crop Recommendation System Setup"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Python
echo -e "${BLUE}Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.8 or higher.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version | cut -d' ' -f2) found${NC}"
echo ""

# Check Node.js
echo -e "${BLUE}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 14 or higher.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"
echo ""

# Setup Backend
echo -e "${BLUE}Setting up Backend...${NC}"
python3 -m venv venv
source venv/bin/activate  # For Linux/macOS
# For Windows, use: venv\Scripts\activate

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Setup Frontend
echo -e "${BLUE}Setting up Frontend...${NC}"
cd frontend
echo "Installing Node dependencies..."
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
cd ..
echo ""

# Create .env file
echo -e "${BLUE}Creating environment configuration...${NC}"
if [ ! -f .env ]; then
    cat > .env << EOF
FLASK_ENV=development
FLASK_DEBUG=1
FLASK_PORT=5000
REACT_APP_API_URL=http://localhost:5000
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi
echo ""

# Check models
echo -e "${BLUE}Verifying ML models...${NC}"
if [ -f "data/models/crop_classifier.pkl" ] && [ -f "data/models/yield_predictor.pkl" ]; then
    echo -e "${GREEN}✓ ML models found${NC}"
else
    echo -e "${RED}⚠ ML models not found. Please ensure they are in data/models/${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}======================================"
echo "✓ Setup Complete!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}To start the application:${NC}"
echo ""
echo "1. Start the Backend:"
echo "   python app.py"
echo ""
echo "2. In another terminal, start the Frontend:"
echo "   cd frontend && npm start"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo -e "${BLUE}For development:${NC}"
echo "   - Backend runs on http://localhost:5000"
echo "   - Frontend runs on http://localhost:3000"
echo ""
echo -e "${BLUE}For more information, see README.md${NC}"
echo ""
