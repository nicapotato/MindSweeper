![Screenshot](screenshot.png)

# Minesweeper (C - SDL2)
Uncover all non mine/flower tiles to win. Left click on a square to uncover it. Right click on a tile to mark it as a mine or with a question mark. These marks are purely for the user keep track of mines or unknown squares. They prevent that tile being uncovered by a left click. The top left number is the number of mines on the board minus the number of flags placed. The top right number is the elapsed time. Any numbered square holds the number of how many mines are immediately touching that square. The first turn may not end the game in a win or lose situation.

# WebAssembly (WASM) Build
You can now build and run the game in a web browser using WebAssembly! 

**Prerequisites:**
- Install Emscripten: `brew install emscripten` (on macOS)

**Building and running:**
```bash
make wasm    # Build the WASM version
make serve   # Start a web server and open in browser
```
Then open your browser to `http://localhost:8000` to play!

The WASM build includes:
- Full game functionality in the browser
- Modern, responsive HTML interface
- All original controls and features
- Cross-platform web compatibility

# ArchLinux instructions.
You will need to make sure SDL2 and SDL2_image is installed.
```
sudo pacman -S --needed base-devel sdl2 sdl2_image
cd
git clone https://github.com/ProgrammingRainbow/Minesweeper-C-SDL2
cd Minesweeper-C-SDL2
make run
```
The Makefile also supports these commands:
```
make rebuild
make clean
make release
make debug
make wasm      # Build WebAssembly version
make serve     # Build WASM and start web server
SRC_DIR=Video8 make rebuild run
CC=clang make clean debug run
```
# Controls
1 through 8 - Change the theme of the game.\
Q, W, E, R, T - Change size from Tiny to Huge.\
A, S, D, F - Change difficulty from Easy to Very Hard\
Left Click on tile to uncover.\
Left Clock on Face to reset.\
Right Click on tile to mark.\
B - Changes size. \
N - Reset. \
Escape - Quits
