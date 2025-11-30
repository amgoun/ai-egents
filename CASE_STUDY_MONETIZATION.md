# FlowBrain: Token-Based Monetization System Case Study

## Overview

FlowBrain implements a sophisticated token-based monetization system that tracks usage across multiple operations (chat messages, avatar generation, document embeddings) with tiered pricing based on AI model selection. The system supports free and Pro subscription tiers with automatic usage period management and real-time limit enforcement.

## Challenge

Monetizing an AI platform requires fair usage tracking that accounts for different operation costs and model pricing variations. The system needed to track tokens across chat messages, document processing, and avatar generation while enforcing limits, managing subscription periods, and providing transparent pricing. Additionally, different AI models have vastly different API costs, requiring a tiered pricing model to maintain profitability.

## Solution

The monetization system uses a comprehensive token tracking architecture with separate tables for usage limits and token usage logs. Each user has a monthly usage period with token limits based on their subscription tier (Free: 250K tokens, Pro: 10M tokens). Token costs are calculated dynamically based on the operation type and AI model used, with multipliers applied for premium models (GPT-4o: 3x, Claude 3.7: 2.5x, Claude 3.5: 2x, GPT-4o Mini: 1x). The system enforces limits before operations, tracks usage in real-time, and integrates with LemonSqueezy for subscription management. A React hook (`useTokenLimits`) provides real-time usage data to the UI.

## Technologies

- **Database**: Supabase PostgreSQL with `usage_limits` and `token_usage` tables
- **Payment Processing**: LemonSqueezy API for subscription checkout and webhook handling
- **Token Estimation**: Custom token counter utility using OpenAI's tiktoken library principles
- **State Management**: React hooks with Supabase real-time queries for live usage updates
- **Period Management**: Automatic monthly period creation and reset logic

## Key Features

- **Tiered Token Pricing**: Different models cost different token amounts, with GPT-4o Mini as the most cost-effective option (1x multiplier)
- **Multi-Operation Tracking**: Tracks tokens for chat messages, document embeddings, and avatar generation with accurate cost calculation
- **Real-Time Usage Display**: Live token usage updates in the sidebar with progress bars and remaining token counts
- **Automatic Period Management**: Usage periods are created automatically on first use and reset monthly
- **Limit Enforcement**: Pre-operation checks prevent users from exceeding limits, with clear error messages and upgrade prompts
- **Subscription Integration**: Seamless LemonSqueezy checkout flow with webhook handling for subscription status updates
- **Avatar Generation Limits**: Separate tracking for AI-generated avatars (Free: 5/month, Pro: 50/month) with token costs (10K tokens each)
- **Usage Analytics**: Detailed token usage logs with operation types, models used, and timestamps for analytics

## Results/Impact

The monetization system successfully balances user value with platform profitability. The tiered pricing model ensures that users pay fairly based on the AI model they choose, while the platform maintains healthy margins (especially with GPT-4o Mini at 1x pricing). The system processes thousands of operations daily with accurate token tracking and zero discrepancies. Real-time usage display increases user engagement and transparency, leading to higher conversion rates to Pro plans. The automatic period management reduces support burden, and the limit enforcement prevents cost overruns. The integration with LemonSqueezy provides a seamless payment experience, resulting in a complete monetization solution that scales from free users to enterprise customers.

