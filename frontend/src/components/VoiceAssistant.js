import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader } from 'lucide-react';
import { aiAPI } from '../services/api';

export default function VoiceAssistant({ user }) {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('idle');
  const [lastResponse, setLastResponse] = useState('');
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-IN';
        
        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          
          if (event.results[0].isFinal) {
            processCommand(transcript.toLowerCase());
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          setStatus('idle');
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setStatus('error');
        };
      }

      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const processCommand = async (command) => {
    setStatus('processing');
    
    let processedCommand = command;
    
    if (command.includes('jarvis')) {
      processedCommand = command.replace(/jarvis,?\s*/gi, '').trim();
      if (!processedCommand) {
        speak('Yes, I\'m listening. How can I help you?');
        return;
      }
    }

    try {
      const res = await aiAPI.query(processedCommand);
      const response = res.data.response || 'I processed your request.';
      
      setLastResponse(response);
      speak(response);
      setStatus('success');
      
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Error processing command:', error);
      speak('Sorry, I encountered an error processing your request.');
      setStatus('error');
    }
  };

  const speak = (text) => {
    if (!synthesisRef.current) return;
    
    synthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    const voices = synthesisRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      (v.lang.startsWith('en') && v.name.includes('Google')) ||
      v.lang === 'en-US' ||
      v.lang === 'en-GB'
    ) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setStatus('idle');
    };

    synthesisRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    setStatus('listening');
    setIsListening(true);
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);
      setStatus('error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setStatus('idle');
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setStatus('idle');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return 'var(--accent-primary)';
      case 'processing': return 'var(--warning)';
      case 'success': return 'var(--success)';
      case 'error': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      zIndex: 1000
    }}>
      <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: status === 'listening' ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s',
          animation: status === 'listening' ? 'pulse 1.5s infinite' : 'none'
        }} onClick={isListening ? stopListening : startListening}>
          {status === 'processing' ? (
            <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'white' }} />
          ) : isListening ? (
            <MicOff size={28} color="white" />
          ) : (
            <Mic size={28} color="white" />
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            {status === 'listening' ? 'Listening...' : 
             status === 'processing' ? 'Processing...' :
             status === 'success' ? 'Done!' :
             status === 'error' ? 'Error' : 'Jarvis'}
          </div>
          <div style={{ fontSize: '12px', color: getStatusColor() }}>
            {isListening ? 'Say a command...' : 'Click to speak'}
          </div>
        </div>

        {lastResponse && (
          <div style={{ 
            maxWidth: '200px', 
            padding: '8px 12px', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}>
            {lastResponse.substring(0, 100)}...
          </div>
        )}

        {(isListening || status === 'processing') && (
          <button 
            className="btn btn-secondary" 
            onClick={stopSpeaking}
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            <Volume2 size={14} /> Stop
          </button>
        )}
      </div>
    </div>
  );
}