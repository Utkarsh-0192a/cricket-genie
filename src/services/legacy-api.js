const express = require('express');
const router = express.Router();
// const { search: googleSearch } = require('./googleSearch');
const { searchDuck } = require('./ducksearch');
const ContentExtractor = require('./extract_content');

let GoogleGenerativeAI;
let genAI;

// Initialize Google GenAI with dynamic import
async function initializeGenAI() {
    if (!GoogleGenerativeAI) {
        const { GoogleGenerativeAI: GAI } = await import("@google/generative-ai");
        GoogleGenerativeAI = GAI;
        genAI = new GoogleGenerativeAI('AIzaSyBmVfZRi_ZUlI6kWNPZ2NpEh7uPmwSid4o');
    }
}

// Chat endpoint

router.post('/chat', async (req, res) => {
    try {
        // Ensure GenAI is initialized
        await initializeGenAI();
        
        const { message } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate cricket response using Google GenAI
        let reply = await generateCricketResponse(message.toLowerCase());

        res.json({ 
            reply,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

async function generateCricketResponse(message) {
    // Ensure GenAI is initialized
    await initializeGenAI();
    
    const prompt = "For the question I'm about to ask, provide only this single line output most relevant search query from most relevant source name i.e website name\nMy question is: " + message;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash"});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const search_term = response.text();
    
    console.log('Generated search term:', search_term);

    const num = 2; // Number of urls to fetch
    const opts = { advanced: true, unique: true };
    
    let searchResults;
    try {
      searchResults = await searchDuck(search_term, num, opts);
      console.log('DuckDuckGo Search Results:', searchResults);
    } catch (err) {
      console.error('Error during DuckDuckGo search:', err);
      return { error: 'Failed to search for information' };
    }

    // Check if we got valid results
    if (!searchResults || searchResults.length === 0) {
      console.log('No search results found');
      return { error: 'No search results found' };
    }
    
    // Extract URLs from search results
    const urls = searchResults.map(result => result.url);
    console.log('DuckDuckGo Search URLs:', urls);

    const contentExtractor = new ContentExtractor();
    try {
        const extractedContent = await contentExtractor.extractMultiple(urls);
        console.log('Extracted Content:', extractedContent);
        
        // Filter out failed extractions
        const validContent = extractedContent.filter(content => 
            content && !content.error && content.metadata && content.content
        );
        
        if (validContent.length === 0) {
            return { error: 'Failed to extract content from any URLs' };
        }
        
        return {
            searchTerm: search_term,
            urls: urls,
            extractedContent: validContent,
            totalResults: validContent.length
        };
    } catch (extractionError) {
        console.error('Content extraction error:', extractionError);
        return { error: 'Failed to extract content from URLs' };
    } finally {
        // Always clean up the browser
        await contentExtractor.close();
    }

}



module.exports = router;

if(require.main === module) {
    console.log('Chat API initialized');
    (async () => {
        try {
            await generateCricketResponse("What is the latest score in the IPL match?");
        } catch (error) {
            console.error('Error testing generateCricketResponse:', error);
        }
    })();
}