import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus } from 'lucide-react';

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feature');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    // Save feedback
    const feedbackData = {
      type: feedbackType,
      message: feedback,
      timestamp: new Date().toISOString(),
    };

    // Get existing feedback
    const existingFeedback = JSON.parse(localStorage.getItem('userFeedback') || '[]');
    localStorage.setItem('userFeedback', JSON.stringify([...existingFeedback, feedbackData]));

    // Show success state
    setSubmitted(true);
    
    // Reset form after 2 seconds
    setTimeout(() => {
      setIsOpen(false);
      setFeedback('');
      setFeedbackType('feature');
      setSubmitted(false);
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="fixed bottom-4 right-4 gap-2"
        >
          <MessageSquarePlus className="h-5 w-5" />
          Send Feedback
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {submitted ? 'Thank You!' : 'Share Your Feedback'}
          </DialogTitle>
        </DialogHeader>

        {!submitted ? (
          <div className="space-y-6">
            <div>
              <Label>What type of feedback do you have?</Label>
              <RadioGroup
                value={feedbackType}
                onValueChange={setFeedbackType}
                className="space-y-2 mt-2"
              >
                <div className="flex items-center">
                  <RadioGroupItem value="feature" id="feature" />
                  <Label htmlFor="feature" className="ml-2">Feature Request</Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="bug" id="bug" />
                  <Label htmlFor="bug" className="ml-2">Bug Report</Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="improvement" id="improvement" />
                  <Label htmlFor="improvement" className="ml-2">Improvement Suggestion</Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="ml-2">Other</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Your Feedback</Label>
              <Textarea
                className="mt-2"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your thoughts..."
              />
            </div>

            <DialogFooter>
              <Button onClick={() => setIsOpen(false)} variant="outline">Cancel</Button>
              <Button onClick={handleSubmit} disabled={!feedback.trim()}>Submit</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-green-600">Your feedback has been submitted!</p>
            <p className="text-sm text-gray-500 mt-2">Thanks for helping us improve.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackButton;