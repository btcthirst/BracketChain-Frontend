# Змінні
BIN := ./node_modules/.bin
NEXT := $(BIN)/next
ESLINT := $(BIN)/eslint

# Кольори для терміналу
CYAN := \033[0;36m
RESET := \033[0m

.PHONY: help dev build start lint clean install-fix

help: ## Показати цю довідку
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'

install-fix: ## Встановити залежності, ігноруючи конфлікти версій (ERRESOLVE)
	npm install --legacy-peer-deps

dev: ## Запустити сервер розробки
	npm run dev

build: ## Побудувати проєкт для продакшну
	npm run build

start: ## Запустити побудований проєкт
	npm run start

lint: ## Перевірити код лінтером
	npm run lint

clean: ## Видалити папку збірки та кеш
	rm -rf .next
	rm -rf out
	rm -rf node_modules
	@echo "$(CYAN)Кеш та node_modules видалено. Виконайте 'make install-fix'$(RESET)"