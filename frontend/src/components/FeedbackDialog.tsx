import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Star, CheckCircle } from 'lucide-react';

interface FeedbackDialogProps {
  trigger?: React.ReactNode;
}

export function FeedbackDialog({ trigger }: FeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate submission (in production, send to your backend or a service like Formspree)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log feedback (you can replace this with an API call)
    console.log('Feedback submitted:', { rating, feedbackType, message });
    
    setIsSubmitted(true);
    setIsSubmitting(false);
    
    // Reset after showing success
    setTimeout(() => {
      setIsOpen(false);
      setTimeout(() => {
        setIsSubmitted(false);
        setRating(0);
        setFeedbackType('general');
        setMessage('');
      }, 300);
    }, 2000);
  };

  const feedbackTypes = [
    { id: 'bug', label: '🐛 Bug', description: 'Report an issue' },
    { id: 'feature', label: '✨ Feature', description: 'Suggest improvement' },
    { id: 'general', label: '💬 General', description: 'Share thoughts' },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline"
            className="border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 font-medium rounded-xl transition-all"
          >
            <MessageSquare size={16} className="mr-2" />
            Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {isSubmitted ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank you!</h3>
            <p className="text-gray-600">Your feedback helps us improve JobFlow.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Send Feedback
              </DialogTitle>
              <DialogDescription>
                Your feedback is anonymous and helps us improve.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Rating */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  How's your experience?
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 rounded transition-colors ${
                        star <= rating 
                          ? 'text-yellow-400' 
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    >
                      <Star className="w-7 h-7" fill={star <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  What type of feedback?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {feedbackTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setFeedbackType(type.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        feedbackType === type.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <div className="text-lg mb-1">{type.label.split(' ')[0]}</div>
                      <div className="text-xs">{type.label.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Your message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  className="w-full h-28 px-3 py-2 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={!message.trim() || isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FeedbackDialog;

