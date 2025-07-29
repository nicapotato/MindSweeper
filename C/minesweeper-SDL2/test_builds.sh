#!/bin/bash

echo "🎮 Minesweeper Build Test Script"
echo "================================"
echo

# Test native build
echo "📱 Testing native Mac build..."
make clean >/dev/null 2>&1
if make all >/dev/null 2>&1; then
    echo "✅ Native build: SUCCESS"
    ls -la minesweeper | grep -E "^-rwx"
else
    echo "❌ Native build: FAILED"
    exit 1
fi

echo

# Test WASM build
echo "🌐 Testing WASM build..."
make clean >/dev/null 2>&1
if make wasm >/dev/null 2>&1; then
    echo "✅ WASM build: SUCCESS"
    ls -la *.html *.js *.wasm | head -3
else
    echo "❌ WASM build: FAILED"
    exit 1
fi

echo
echo "🎉 All builds successful!"
echo "📝 Usage:"
echo "   Native: ./minesweeper"
echo "   WASM:   make serve"
echo
echo "🚀 Ready to play Minesweeper!" 