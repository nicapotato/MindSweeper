TARGET			= minesweeper
BUILD_DIR		= .build
SRC_DIR			?= src
CC				?= gcc

# WASM build support
ifdef WASM
	CC			= emcc
	TARGET		= index.html
	WASM_CFLAGS	= -s USE_SDL=2 -s USE_SDL_IMAGE=2 -s USE_SDL_TTF=2 -s USE_SDL_MIXER=2 -IcJSON-1.7.18
	WASM_LDFLAGS = -s USE_SDL=2 -s USE_SDL_IMAGE=2 -s USE_SDL_TTF=2 -s USE_SDL_MIXER=2 -s SDL2_IMAGE_FORMATS='["png"]' \
				  -s SDL2_MIXER_FORMATS='["wav", "mp3"]' \
				  -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=1gb \
				  -s EXPORTED_FUNCTIONS='["_main"]' \
				  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
				  --embed-file assets@/assets \
				  --shell-file shell_template.html
	CFLAGS_BASE	= -std=c11 -DWASM_BUILD $(WASM_CFLAGS)
	LDLIBS_BASE	= $(WASM_LDFLAGS)
else
	CFLAGS_BASE	= -std=c11
endif

CFLAGS_STRICT	= -Wstrict-aliasing=2 -Wall -Wextra -Werror -Wpedantic \
				  -Wwrite-strings -Wconversion -Wmissing-declarations \
				  -Wmissing-include-dirs -Wfloat-equal -Wsign-compare -Wundef \
				  -Wcast-align -Wimplicit-fallthrough \
				  -Wempty-body -Wuninitialized -Wmisleading-indentation \
				  -Wshadow -Wmissing-prototypes -Wstrict-prototypes \
				  -Wold-style-definition

CFLAGS_RELEASE	= -O3 -march=native -flto=auto -fno-plt -fomit-frame-pointer

CFLAGS_DEBUG	= -O0 -g3 -ggdb3 -fno-strict-aliasing -fstack-protector-strong \
				  -DDEBUG -fno-omit-frame-pointer

LDLIBS_BASE		=

LDLIBS_RELEASE	= -flto

LDLIBS_DEBUG	=

SRCS			= $(wildcard $(SRC_DIR)/*.c)
ifdef WASM
SRCS			+= cJSON-1.7.18/cJSON.c
endif
OBJS			= $(addprefix $(BUILD_DIR)/, $(notdir $(SRCS:.c=.o)))
ifdef WASM
OBJS			+= $(BUILD_DIR)/cJSON.o
endif
DEPS			= $(OBJS:.o=.d)

ifeq ($(OS),Windows_NT)
	PKG_CONFIG	:= $(shell where pkg-config >NUL 2>&1 && echo "yes" || echo "no")
	CLEAN		= del /f $(TARGET).exe & if exist $(BUILD_DIR) rmdir /s /q $(BUILD_DIR)
	MKDIR		= if not exist $(BUILD_DIR) mkdir
else
ifndef WASM
	CFLAGS_DEBUG	+= -fsanitize=address -fsanitize-address-use-after-scope \
					   -ftrapv
	LDLIBS_DEBUG	+= -fsanitize=address -fsanitize-address-use-after-scope
endif
	PKG_CONFIG	:= $(shell command -v pkg-config >/dev/null 2>&1 && echo "yes" || echo "no")
	CLEAN		= $(RM) -f $(TARGET) && $(RM) -rf $(BUILD_DIR)
	MKDIR		= mkdir -p $(BUILD_DIR)
endif

ifndef WASM
ifeq ($(PKG_CONFIG),yes)
    CFLAGS_BASE += $(shell pkg-config --cflags sdl2 SDL2_image SDL2_ttf SDL2_mixer) -I$(shell brew --prefix cjson)/include
    LDLIBS_BASE += $(shell pkg-config --libs sdl2 SDL2_image SDL2_ttf SDL2_mixer) -L$(shell brew --prefix cjson)/lib -lcjson
else
    $(error "pkg-config is not available. Please install pkg-config.")
endif
endif

CFLAGS		?= $(CFLAGS_BASE)
LDLIBS		?= $(LDLIBS_BASE)

$(BUILD_DIR):
	$(MKDIR)

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -MMD -MP -c $< -o $@

ifdef WASM
$(BUILD_DIR)/cJSON.o: cJSON-1.7.18/cJSON.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -MMD -MP -c $< -o $@
endif

$(TARGET): $(OBJS)
	$(CC) $^ -o $@ $(LDLIBS)

-include $(DEPS)

.PHONY: all clean run rebuild release debug wasm serve

all: $(TARGET)

release: CFLAGS = $(CFLAGS_BASE) $(CFLAGS_STRICT) $(CFLAGS_RELEASE)
release: LDLIBS = $(LDLIBS_BASE) $(LDLIBS_RELEASE)
release: all

debug: CFLAGS = $(CFLAGS_BASE) $(CFLAGS_STRICT) $(CFLAGS_DEBUG)
debug: LDLIBS = $(LDLIBS_BASE) $(LDLIBS_DEBUG)
debug: all

clean:
	$(CLEAN)

run: $(TARGET)
	./$<

rebuild: clean all

wasm: 
	$(MAKE) clean
	$(MAKE) all WASM=1 CC=emcc TARGET=index.html \
		CFLAGS_BASE="-std=c11 -DWASM_BUILD -s USE_SDL=2 -s USE_SDL_IMAGE=2 -s USE_SDL_TTF=2 -s USE_SDL_MIXER=2 -IcJSON-1.7.18" \
		LDLIBS_BASE="-s USE_SDL=2 -s USE_SDL_IMAGE=2 -s USE_SDL_TTF=2 -s USE_SDL_MIXER=2 -s SDL2_IMAGE_FORMATS='[\"png\"]' -s SDL2_MIXER_FORMATS='[\"wav\", \"ogg\", \"mp3\"]' -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=1gb -s EXPORTED_FUNCTIONS='[\"_main\"]' -s EXPORTED_RUNTIME_METHODS='[\"ccall\", \"cwrap\"]' --embed-file assets@/assets --shell-file shell_template.html"

serve: wasm
	@echo "Starting web server on http://localhost:8000"
	@echo "Open your browser and navigate to http://localhost:8000"
	python3 -m http.server 8000
