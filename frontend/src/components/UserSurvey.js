import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const UserSurvey = ({ onClose }) => {
  const [showSurvey, setShowSurvey] = useState(false);
  const [formData, setFormData] = useState({
    background: '',
    otherBackground: '',
    interest: '',
    affiliation: '',
  });

  useEffect(() => {
    // Check if user has completed survey before
    const hasCompletedSurvey = localStorage.getItem('surveyCompleted');
    if (!hasCompletedSurvey) {
      // Show survey after 5 seconds
      const timer = setTimeout(() => setShowSurvey(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = () => {
    // Save survey data
    const surveyData = {
      ...formData,
      timestamp: new Date().toISOString(),
    };

    // Get existing responses
    const existingResponses = JSON.parse(localStorage.getItem('surveyResponses') || '[]');
    localStorage.setItem('surveyResponses', JSON.stringify([...existingResponses, surveyData]));
    localStorage.setItem('surveyCompleted', 'true');

    // Close survey
    setShowSurvey(false);
    if (onClose) onClose(surveyData);
  };

  if (!showSurvey) return null;

  return (
    <Dialog open={showSurvey} onOpenChange={setShowSurvey}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Help Us Improve</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label>What best describes your background?</Label>
            <RadioGroup
              value={formData.background}
              onValueChange={(value) => setFormData({ ...formData, background: value })}
              className="space-y-2 mt-2"
            >
              <div className="flex items-center">
                <RadioGroupItem value="higher-ed" id="higher-ed" />
                <Label htmlFor="higher-ed" className="ml-2">Higher Education</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="college" id="college" />
                <Label htmlFor="college" className="ml-2">College Student</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="faculty" id="faculty" />
                <Label htmlFor="faculty" className="ml-2">Faculty</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="researcher" id="researcher" />
                <Label htmlFor="researcher" className="ml-2">Researcher</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="ml-2">Other</Label>
              </div>
            </RadioGroup>

            {formData.background === 'other' && (
              <Input
                className="mt-2"
                placeholder="Please specify"
                value={formData.otherBackground}
                onChange={(e) => setFormData({ ...formData, otherBackground: e.target.value })}
              />
            )}
          </div>

          <div>
            <Label>Why are you interested in accessing this website?</Label>
            <Textarea
              className="mt-2"
              value={formData.interest}
              onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
            />
          </div>

          <div>
            <Label>Are you from a college news outlet or independent researcher?</Label>
            <RadioGroup
              value={formData.affiliation}
              onValueChange={(value) => setFormData({ ...formData, affiliation: value })}
              className="space-y-2 mt-2"
            >
              <div className="flex items-center">
                <RadioGroupItem value="college-news" id="college-news" />
                <Label htmlFor="college-news" className="ml-2">College News</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="independent" id="independent" />
                <Label htmlFor="independent" className="ml-2">Independent</Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="neither" id="neither" />
                <Label htmlFor="neither" className="ml-2">Neither</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setShowSurvey(false)} variant="outline">Skip</Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserSurvey;