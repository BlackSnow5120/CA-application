#!/bin/bash
# Run once after docker-compose up to pull models into Ollama
# Models are cached in the ollama_models Docker volume — only downloads once

echo "Pulling Ollama models for CA Firm software..."

# Primary model — best for drafting and structured tasks
docker exec ca-firm-ollama-1 ollama pull llama3.1:8b

# Fallback model — smaller, faster, for column mapping and quick tasks
docker exec ca-firm-ollama-1 ollama pull mistral:7b

echo "Done. Models cached — no re-download needed on restart."
