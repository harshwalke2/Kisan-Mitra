import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Minimize2, 
  Maximize2,
  Sprout,
  Sun,
  CloudRain,
  Bug,
  Pill,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const quickQuestions = [
  { icon: Bug, label: 'Disease Help', question: 'My wheat crop has yellow spots. What could it be?' },
  { icon: Pill, label: 'Fertilizer', question: 'What fertilizer should I use for rice?' },
  { icon: Sun, label: 'Weather', question: 'What crops are best for this season?' },
  { icon: CloudRain, label: 'Irrigation', question: 'How often should I water my crops?' },
];

const botResponses: Record<string, string> = {
  'disease': `Based on your description of yellow spots on wheat, this could be Yellow Rust (Stripe Rust) disease. 

**Symptoms:**
- Yellow to orange pustules in stripes
- Occurs on leaves, rarely on stems
- Severe in cool, humid conditions

**Recommendations:**
1. Apply fungicide containing propiconazole or tebuconazole
2. Remove and destroy infected plant parts
3. Improve air circulation between plants
4. Use resistant varieties for future planting

Would you like to upload a photo for more accurate diagnosis?`,

  'fertilizer': `For rice cultivation, here's the recommended fertilizer schedule:

**Basal Application (Before Planting):**
- 50 kg DAP per acre
- 25 kg MOP per acre

**Top Dressing:**
- 50 kg Urea per acre at tillering stage
- 25 kg Urea per acre at panicle initiation

**Organic Options:**
- Apply 5-10 tons of FYM per acre
- Use green manure crops like dhaincha

**Micronutrients:**
- Zinc sulfate: 25 kg/ha (if deficient)

Would you like specific recommendations based on your soil type?`,

  'weather': `Based on the current season and weather patterns, here are the recommended crops:

**Kharif Season (June-October):**
- Rice, Cotton, Sugarcane, Soybean
- Maize, Millets, Groundnut

**Rabi Season (November-April):**
- Wheat, Barley, Mustard, Gram
- Peas, Lentils, Potatoes

**Current Weather Advisory:**
- Temperature: 32°C (Suitable for most crops)
- Humidity: 65% (Good for growth)
- Rainfall expected in 3 days

**Recommendation:**
This is a good time to prepare for Kharif planting. Would you like specific crop recommendations for your region?`,

  'irrigation': `General irrigation guidelines for common crops:

**Rice:**
- Keep field flooded with 2-5 cm water
- Critical stages: Tillering, Flowering

**Wheat:**
- 4-6 irrigations total
- Critical: Crown root, Flowering, Grain filling

**Vegetables:**
- Daily light irrigation preferred
- Morning irrigation is best

**Water-Saving Tips:**
1. Use drip irrigation where possible
2. Mulch to reduce evaporation
3. Irrigate during cooler hours
4. Check soil moisture before watering

Would you like irrigation schedule for a specific crop?`,

  'default': `Thank you for your question! I'm here to help with:

🌱 **Crop Disease Identification**
💊 **Fertilizer & Pesticide Recommendations**
🌤️ **Weather-based Farming Advice**
💧 **Irrigation Scheduling**
📈 **Market Price Information**
🏛️ **Government Scheme Guidance**

Please select a quick question below or type your specific query. You can also upload crop images for disease detection!`
};

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: botResponses.default,
      timestamp: new Date(),
      suggestions: ['Disease Help', 'Fertilizer Guide', 'Weather Advice', 'Irrigation Tips']
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getBotResponse = (userMessage: string): string => {
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes('disease') || lowerMsg.includes('spot') || lowerMsg.includes('yellow') || lowerMsg.includes('rot')) {
      return botResponses.disease;
    }
    if (lowerMsg.includes('fertilizer') || lowerMsg.includes('nutrient') || lowerMsg.includes('manure')) {
      return botResponses.fertilizer;
    }
    if (lowerMsg.includes('weather') || lowerMsg.includes('season') || lowerMsg.includes('crop') && lowerMsg.includes('grow')) {
      return botResponses.weather;
    }
    if (lowerMsg.includes('water') || lowerMsg.includes('irrigation') || lowerMsg.includes('sprinkle')) {
      return botResponses.irrigation;
    }
    
    return botResponses.default;
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate bot thinking
    setTimeout(() => {
      const botResponse = getBotResponse(userMsg.content);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    setTimeout(() => {
      const userMsg: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: question,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      setTimeout(() => {
        const botResponse = getBotResponse(question);
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: botResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, 1000);
    }, 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
      >
        <Bot className="w-7 h-7 text-white" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden transition-all duration-300 ${
        isMinimized ? 'h-14' : 'h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Agro Assistant</h3>
            <p className="text-xs text-green-100 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/20 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    {message.type === 'bot' ? (
                      <>
                        <AvatarImage src="/bot-avatar.png" />
                        <AvatarFallback className="bg-green-100 text-green-600">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-600">U</AvatarFallback>
                    )}
                  </Avatar>
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm ${
                      message.type === 'user'
                        ? 'bg-green-500 text-white rounded-br-none'
                        : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line">{message.content}</div>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-green-100 text-green-600">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 rounded-bl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 mb-2">Quick Questions:</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {quickQuestions.map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.label}
                    onClick={() => handleQuickQuestion(q.question)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs whitespace-nowrap hover:bg-green-100 transition-colors"
                  >
                    <Icon className="w-3 h-3" />
                    {q.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about crops, diseases, weather..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                className="bg-gradient-to-r from-green-600 to-emerald-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
