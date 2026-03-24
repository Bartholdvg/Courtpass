#!/bin/bash

echo "🚀 CourtPass Next.js Setup Script"
echo "=================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    
    # Try to install via curl (for arm64 or x64 Macs)
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        echo "📥 Downloading Node.js for Apple Silicon..."
        curl -fsSL https://nodejs.org/dist/v20.10.0/node-v20.10.0-darwin-arm64.tar.xz | tar xz -C /tmp
        sudo mv /tmp/node-v20.10.0-darwin-arm64 /usr/local/node-v20
    else
        echo "📥 Downloading Node.js for Intel Mac..."
        curl -fsSL https://nodejs.org/dist/v20.10.0/node-v20.10.0-darwin-x64.tar.xz | tar xz -C /tmp
        sudo mv /tmp/node-v20.10.0-darwin-x64 /usr/local/node-v20
    fi
    
    sudo ln -sf /usr/local/node-v20/bin/node /usr/local/bin/node
    sudo ln -sf /usr/local/node-v20/bin/npm /usr/local/bin/npm
    
    echo "✅ Node.js installed!"
else
    echo "✅ Node.js $(node --version) found"
fi

# Install dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "🚀 To start development:"
    echo "   npm run dev"
    echo ""
    echo "📖 Then open http://localhost:3000 in your browser"
else
    echo ""
    echo "❌ Installation failed. Please check the errors above."
    exit 1
fi
