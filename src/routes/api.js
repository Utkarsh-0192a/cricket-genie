const express = require('express');
const router = express.Router();
const { searchDuck } = require('../services/search');
const ContentExtractor = require('../services/content-extractor');
const logger = require('../services/logger');
require('dotenv').config();

let GoogleGenerativeAI;
let genAI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Default chat history set to todays date
const today = new Date();
const deafult_chat_history = {
    user: `What is the current date?`,
    assistant: `Today's date is ${today.toLocaleDateString()}.`
};


// Initialize Google GenAI with dynamic import
async function initializeGenAI() {
    if (!GoogleGenerativeAI) {
        try {
            const { GoogleGenerativeAI: GAI } = await import("@google/generative-ai");
            GoogleGenerativeAI = GAI;
            
            if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
                throw new Error('GEMINI_API_KEY is not set or empty');
            }
            
            genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            logger.info('GenAI initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize GenAI:', error);
            throw error;
        }
    }
}

// Chat endpoint
router.post('/chat', async (req, res) => {
    try {
        // Ensure GenAI is initialized
        await initializeGenAI();
        
        const { message, chatHistory = [deafult_chat_history] } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message is required' });
        }

        logger.api('Received message:', message);
        logger.api('Chat history length:', chatHistory.length);

        // Generate cricket response using Google GenAI with chat history
        const result = await generateCricketResponse(message.toLowerCase(), chatHistory);

        if (result.error) {
            return res.status(500).json({ error: result.error });
        }

        try {
            // Generate final answer using extracted content
            const finalAnswer = await generateFinalAnswer(message, result.extractedContent, chatHistory);
            
            logger.api('Chat response generated successfully', { 
                messageLength: message.length,
                responseLength: finalAnswer.length,
                extractedSources: result.extractedContent?.length || 0
            });
            
            res.json({ 
                reply: finalAnswer,
                timestamp: new Date().toISOString()
            });
        } catch (answerError) {
            logger.error('Final answer generation error:', { 
                error: answerError.message, 
                stack: answerError.stack,
                message: message.substring(0, 100)
            });
            res.status(500).json({ 
                error: 'Failed to generate response',
                details: process.env.NODE_ENV === 'development' ? answerError.message : undefined
            });
        }
    } catch (error) {
        logger.error('Chat API error:', { 
            error: error.message, 
            stack: error.stack,
            message: req.body?.message?.substring(0, 100)
        });
        res.status(500).json({ 
            error: 'Failed to process message',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

async function generateCricketResponse(message, chatHistory = [default_chat_history]) {
    // Ensure GenAI is initialized
    await initializeGenAI();
    
    // Create context-aware prompt that includes chat history
    let conversationContext = '';
    if (chatHistory.length > 0) {
        conversationContext = '\n\nPrevious conversation:\n';
        chatHistory.slice(-3).forEach((entry) => {
            conversationContext += `User: ${entry.user}\nAssistant: ${entry.assistant}\n`;
        });
    }
    
    const prompt = `You are an advanced cricket assistant. For the question I'm about to ask, provide only a single line with the most relevant search query that will help find current cricket information. Keep it concise and focused.
${conversationContext}
Current question: ${message}`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash"});
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const search_term = response.text().trim();
        
        logger.search('Generated search term:', search_term);

        const num = 5; // Number of URLs to fetch
        const opts = { advanced: true, unique: true };
        
        let searchResults;
        try {
            searchResults = await searchDuck(search_term, num, opts);
            logger.search('DuckDuckGo Search Results:', { count: searchResults.length });
        } catch (err) {
            logger.error('Error during DuckDuckGo search:', err);
            return { error: 'Failed to search for information' };
        }

        // Check if we got valid results
        if (!searchResults || searchResults.length === 0) {
            logger.warn('No search results found');
            return { error: 'No search results found' };
        }
        
        // Extract URLs from search results
        const urls = searchResults.map(result => result.url);
        logger.search('DuckDuckGo Search URLs:', urls);

        // Extract content until first successful extraction
        const contentExtractor = new ContentExtractor();
        try {
            let extractedContent = null;
            
            // Try each URL until we get successful content extraction
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                logger.extraction(`Attempting extraction ${i + 1}/${urls.length}: ${url}`);
                
                try {
                    const singleResult = await contentExtractor.extractSingle(url);
                    
                    if (singleResult && singleResult.success && singleResult.data) {
                        logger.extraction(`First successful extraction from: ${url}`);
                        extractedContent = [singleResult];
                        break; // Stop after first successful extraction
                    }
                } catch (extractionError) {
                    logger.warn(`Extraction failed for ${url}:`, extractionError.message);
                    continue; // Try next URL
                }
            }
            
            if (!extractedContent || extractedContent.length === 0) {
                logger.warn('Failed to extract content from any URLs');
                return { error: 'Failed to extract content from any URLs' };
            }
            
            logger.extraction(`Successfully extracted content`, {
                totalUrls: urls.length,
                successfulExtractions: extractedContent.length
            });
            
            return {
                searchTerm: search_term,
                urls: urls,
                extractedContent: extractedContent,
                totalResults: extractedContent.length
            };
        } catch (extractionError) {
            logger.error('Content extraction error:', extractionError);
            return { error: 'Failed to extract content from URLs' };
        } finally {
            // Always clean up the browser
            await contentExtractor.close();
        }
    } catch (error) {
        logger.error('Error generating cricket response:', error);
        return { error: 'Failed to generate search query' };
    }
}

async function generateFinalAnswer(userQuestion, extractedContent, chatHistory = []) {
    // Ensure GenAI is initialized
    await initializeGenAI();
    
    // Prepare context from extracted content - only main data
    let contextData = '';
    if (extractedContent && extractedContent.length > 0) {
        extractedContent.forEach((content, index) => {
            if (content.success && content.data) {
                // Only include the main text content without metadata
                const mainContent = content.data.content?.text || content.data.text || content.data.content || content.data || '';
                // Ensure mainContent is a string
                const contentStr = typeof mainContent === 'string' ? mainContent : String(mainContent);
                if (contentStr && contentStr.trim && contentStr.trim()) {
                    // Limit content to first 1500 characters for conciseness
                    const limitedContent = contentStr.trim().substring(0, 1500);
                    contextData += limitedContent + '\n\n';
                }
            }
        });
    }
    
    // Prepare chat history context
    let conversationContext = '';
    if (chatHistory.length > 0) {
        conversationContext = '\n\nPrevious conversation:\n';
        chatHistory.slice(-3).forEach((entry) => {
            conversationContext += `User: ${entry.user}\nAssistant: ${entry.assistant}\n`;
        });
    }

    const prompt = `You are an expert cricket and fantasy cricket assistant specializing in IPL, Dream11, and fantasy sports strategy. Answer the user's question using the provided context and conversation history.

CORE CAPABILITIES:
- General cricket knowledge and match analysis
- Fantasy cricket team building and optimization
- Player performance analysis and recommendations
- Match predictions and strategic insights
- Dream11 team composition and captain/vice-captain suggestions

RESPONSE REQUIREMENTS:
- Be concise, actionable, and data-driven
- Use proper formatting with headers, bullet points, and line breaks
- Focus on answering the question while providing valuable fantasy insights
- Include specific player recommendations when relevant
- Provide reasoning behind suggestions

FANTASY CRICKET ASSISTANCE:
When helping with fantasy teams, always include:
• **Team Composition**: Balanced selection of batsmen, bowlers, all-rounders, wicket-keepers
• **Captain/Vice-Captain**: High-impact players with scoring potential
• **Budget Optimization**: Stay within credit limits (98-100 credits for Dream11)
• **Form Analysis**: Recent performance trends and match-ups
• **Pitch Conditions**: How venue affects player selection
• **Risk Assessment**: Safe picks vs differential players

FORMATTING GUIDELINES:
- Use **bold** for key recommendations
- Use bullet points for player lists and strategies
- Include 🏏 cricket emojis for visual appeal
- Structure responses with clear sections when providing team suggestions

${conversationContext}

Current question: ${userQuestion}

Available context:
${contextData}

Provide a comprehensive, well-formatted answer that addresses the question and offers actionable fantasy cricket insights:`;


    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash"});
        logger.ai('Generating response with Gemini', { 
            promptLength: prompt.length,
            contextLength: contextData.length,
            question: userQuestion.substring(0, 100)
        });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const finalText = response.text().trim();
        logger.debug('Generated final response:', finalText); // Log first 200 chars for brevity
        
        logger.ai('AI response generated successfully', {
            responseLength: finalText.length
        });
        
        return finalText;
    } catch (error) {
        logger.error('Error generating final answer:', { 
            error: error.message,
            stack: error.stack,
            promptLength: prompt.length,
            hasGenAI: !!genAI,
            hasAPIKey: !!GEMINI_API_KEY
        });
        return "I apologize, but I'm having trouble generating a response right now. Please try again.";
    }
}



module.exports = router;

// Remove the test code that runs when file is executed directly
// This was causing extra logging output
// if(require.main === module) {
//     (async () => {
//         try {
//             await initializeGenAI();
//              console.log('Chat API initialized');
//             const result = await generateCricketResponse("who has highest sixes in this ipl?");
//             logger.extraction('Test generateCricketResponse result:', result);
//             console.log('Test generateCricketResponse result:', result.extractedContent);
//         } catch (error) {
//             console.error('Error testing generateCricketResponse:', error);
//         }
//     })();
// }