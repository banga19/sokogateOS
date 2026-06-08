---
name: "LLM Council"
description: "Creates a system that queries multiple LLMs, collects their answers, has them review each other's responses, and synthesizes a final answer using a Chairman model. Use when you need diverse AI perspectives or want to improve answer quality through model collaboration."
---

# LLM Council

## What This Skill Does

Implements the LLM Council pattern where multiple language models provide independent answers to a query, review and rank each other's responses anonymously, and a Chairman model synthesizes the best elements into a final answer. This improves answer quality through diverse perspectives and collaborative refinement.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up OpenRouter API key in .env
OPENROUTER_API_KEY=your_key_here

# 3. Run the application
npm start
```

## Step-by-Step Guide

### Step 1: Initial Setup

1. Clone the repository or copy the LLM Council implementation
2. Install required dependencies:
   ```bash
   npm install
   ```
3. Configure your OpenRouter API key in the `.env` file:
   ```env
   OPENROUTER_API_KEY=your_actual_openrouter_key
   ```

### Step 2: Understanding the Architecture

The LLM Council consists of several components:
- **Multiple Council Members**: Different LLMs that provide initial answers
- **Review Process**: Each model reviews and ranks others' answers anonymously
- **Chairman Model**: Synthesizes the best elements into a final answer
- **User Interface**: Shows tab views of initial opinions, review stages, and final result

### Step 3: Configuration

Modify the configuration to select which models participate:
- Edit `src/config/models.js` to choose council member models
- Adjust the chairman model selection in `src/config/chairman.js`
- Set temperature and other parameters as needed

### Step 4: Running the Council

Start the application:
```bash
npm start
```

The web interface will be available at `http://localhost:3000`

## How It Works

1. **Query Distribution**: The same question is sent to multiple LLMs (council members)
2. **Independent Answers**: Each model provides an answer without seeing others' responses
3. **Anonymous Review**: Answers are shuffled and presented to each model for review and ranking
4. **Synthesis**: The Chairman model analyzes all reviews and creates a final synthesized answer
5. **Presentation**: Users see the initial opinions, review process, and final result in tabs

## Customization Options

### Model Selection
Choose different models for council members and chairman by modifying the configuration files:
- Open-source models (Llama, Mistral, etc.)
- Proprietary models (GPT, Claude, Gemini via OpenRouter)
- Local models if supported

### Parameters
Adjust temperature, max tokens, and other generation parameters for different models

### Review Process
Modify how many reviews each answer gets or change the ranking criteria

## Troubleshooting

### Issue: API Connection Failed
- **Symptoms**: Error messages about unable to connect to OpenRouter
- **Solution**: Verify your OPENROUTER_API_KEY is correct and has sufficient credits

### Issue: Slow Response Times
- **Symptoms**: Council takes too long to produce answers
- **Solution**: Reduce the number of council members or use faster models

### Issue: Poor Quality Synthesis
- **Symptoms**: Final answer doesn't effectively combine insights
- **Solution**: Experiment with different chairman models or adjust review weighting

## Related Skills
- [Prompt Engineering](prompt-engineering/) - For crafting effective queries to the council
- [Model Selection](model-selection/) - For choosing optimal models for different tasks
- [Ensemble Methods](ensemble-methods/) - For other approaches to combining model outputs

## Resources
- [Original LLM Council Repository](https://github.com/karpathy/llm-council)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [LLM Comparison Studies](https://arxiv.org/abs/2305.14325)