# ══════════════════════════════════════════════════════════════════════════════
#  BracketChain — Frontend Makefile
#  Usage: make <target>
# ══════════════════════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────
SHELL := /bin/bash
.DEFAULT_GOAL := help

BIN        := ./node_modules/.bin
NEXT       := $(BIN)/next
ESLINT     := $(BIN)/eslint
TSC        := $(BIN)/tsc

# Terminal colors
CYAN       := \033[0;36m
GREEN      := \033[0;32m
YELLOW     := \033[0;33m
RED        := \033[0;31m
BOLD       := \033[1m
RESET      := \033[0m

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
.PHONY: help
help: ## Show this help
	@echo ""
	@echo "  $(BOLD)BracketChain Frontend$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ──────────────────────────────────────────────
# Install
# ──────────────────────────────────────────────
.PHONY: install
install: ## Install dependencies
	npm ci

.PHONY: install-fix
install-fix: ## Install dependencies ignoring peer conflicts (ERRESOLVE)
	npm install --legacy-peer-deps

.PHONY: install-clean
install-clean: clean-modules install ## Clean node_modules and reinstall

# ──────────────────────────────────────────────
# Development
# ──────────────────────────────────────────────
.PHONY: dev
dev: ## Start development server (port 3000)
	npm run dev

.PHONY: dev-turbo
dev-turbo: ## Start development server with Turbopack
	$(NEXT) dev --turbopack

.PHONY: dev-https
dev-https: ## Start development server with HTTPS (requires mkcert)
	$(NEXT) dev --experimental-https

# ──────────────────────────────────────────────
# Build & Start
# ──────────────────────────────────────────────
.PHONY: build
build: ## Build for production
	npm run build

.PHONY: build-analyze
build-analyze: ## Build and open bundle analyzer
	ANALYZE=true npm run build

.PHONY: start
start: ## Start production server (requires build first)
	npm run start

.PHONY: preview
preview: build start ## Build then start production server

# ──────────────────────────────────────────────
# Code Quality
# ──────────────────────────────────────────────
.PHONY: lint
lint: ## Run ESLint
	npm run lint

.PHONY: lint-fix
lint-fix: ## Run ESLint and auto-fix issues
	$(ESLINT) . --fix

.PHONY: type-check
type-check: ## Run TypeScript compiler check (no emit)
	$(TSC) --noEmit

.PHONY: check
check: lint type-check ## Run all checks (lint + type-check)

# ──────────────────────────────────────────────
# Clean
# ──────────────────────────────────────────────
.PHONY: clean
clean: ## Remove build artifacts and cache
	@rm -rf .next out
	@echo "$(GREEN)✓ Build artifacts removed$(RESET)"

.PHONY: clean-modules
clean-modules: ## Remove node_modules
	@rm -rf node_modules
	@echo "$(GREEN)✓ node_modules removed$(RESET)"

.PHONY: clean-all
clean-all: clean clean-modules ## Remove everything (artifacts + node_modules)
	@rm -rf .turbo *.tsbuildinfo
	@echo "$(GREEN)✓ Full clean complete — run 'make install' to restore$(RESET)"

# ──────────────────────────────────────────────
# Utilities
# ──────────────────────────────────────────────
.PHONY: env
env: ## Copy .env.example to .env.local (if not exists)
	@if [ ! -f .env.local ]; then \
		cp .env.example .env.local; \
		echo "$(GREEN)✓ .env.local created from .env.example$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ .env.local already exists — skipping$(RESET)"; \
	fi

.PHONY: format
format: ## Format code with Prettier (if installed)
	@if [ -f "$(BIN)/prettier" ]; then \
		$(BIN)/prettier --write .; \
		echo "$(GREEN)✓ Code formatted$(RESET)"; \
	else \
		echo "$(RED)✗ Prettier not found in node_modules$(RESET)"; \
	fi

.PHONY: ci
ci: install lint type-check build ## Full CI pipeline (install → lint → type-check → build)
	@echo "$(GREEN)$(BOLD)✓ CI pipeline passed$(RESET)"

.PHONY: info
info: ## Show environment info
	@echo ""
	@echo "  $(BOLD)Environment$(RESET)"
	@echo "  Node    $$(node -v)"
	@echo "  npm     $$(npm -v)"
	@echo "  Next.js $$(node -p "require('./package.json').dependencies.next" 2>/dev/null || echo 'n/a')"
	@echo ""