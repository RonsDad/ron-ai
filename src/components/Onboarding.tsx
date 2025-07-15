import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  User, 
  Shield, 
  Heart, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Bot
} from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
  onSubmitData?: (data: any) => Promise<boolean>;
}

export function Onboarding({ onComplete, onSubmitData }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    insuranceProvider: "",
    healthGoals: [] as string[]
  });

  const steps = [
    {
      id: "personal",
      title: "Personal Information",
      subtitle: "Basic details to personalize your experience",
      icon: User
    },
    {
      id: "insurance",
      title: "Insurance Details",
      subtitle: "Help us verify coverage and find in-network providers",
      icon: Shield
    },
    {
      id: "preferences",
      title: "Health Goals",
      subtitle: "What matters most to you?",
      icon: Heart
    }
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsLoading(true);
      setError(null);
      
      try {
        if (onSubmitData) {
          const success = await onSubmitData(formData);
          if (success) {
            onComplete();
          } else {
            setError("Failed to save your information. Please try again.");
            setIsLoading(false);
          }
        } else {
          // For demo purposes, proceed directly
          onComplete();
        }
      } catch (err) {
        setError("Unable to connect to our servers. Please check your connection and try again.");
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleHealthGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      healthGoals: prev.healthGoals.includes(goal)
        ? prev.healthGoals.filter(g => g !== goal)
        : [...prev.healthGoals, goal]
    }));
  };

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-8"
      style={{ background: 'var(--cloud-black)' }}
    >
      <div className="w-full max-w-2xl">
        <div className="space-y-8 animate-fade-in">
          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm" style={{ color: 'var(--cloud-text-secondary)' }}>
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm" style={{ color: 'var(--cloud-text-secondary)' }}>
                {Math.round(((currentStep + 1) / steps.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-1 rounded-full" style={{ background: 'var(--cloud-surface)' }}>
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                  background: 'var(--cloud-orange)'
                }}
              />
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" 
                style={{ background: 'var(--cloud-surface)', border: '1px solid var(--cloud-border)' }}>
                <IconComponent size={32} style={{ color: 'var(--cloud-orange)' }} />
              </div>
            </div>
            <h1 className="text-3xl font-medium mb-2" style={{ color: 'var(--cloud-text-primary)' }}>
              {currentStepData.title}
            </h1>
            <p className="text-lg" style={{ color: 'var(--cloud-text-secondary)' }}>
              {currentStepData.subtitle}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-lg text-center" style={{ 
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)'
            }}>
              <p className="text-sm font-medium" style={{ color: 'var(--cloud-error)' }}>
                {error}
              </p>
            </div>
          )}

          {/* Step Content */}
          <div className="space-y-6">
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--cloud-text-primary)' }}>
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateFormData("firstName", e.target.value)}
                      placeholder="John"
                      className="w-full h-12 cloud-input"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName" className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--cloud-text-primary)' }}>
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateFormData("lastName", e.target.value)}
                      placeholder="Doe"
                      className="w-full h-12 cloud-input"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="dateOfBirth" className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--cloud-text-primary)' }}>
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateFormData("dateOfBirth", e.target.value)}
                    className="w-full h-12 cloud-input"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone" className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--cloud-text-primary)' }}>
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full h-12 cloud-input"
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="insuranceProvider" className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--cloud-text-primary)' }}>
                    Insurance Provider
                  </Label>
                  <Input
                    id="insuranceProvider"
                    type="text"
                    value={formData.insuranceProvider}
                    onChange={(e) => updateFormData("insuranceProvider", e.target.value)}
                    placeholder="e.g., Aetna, Blue Cross Blue Shield"
                    className="w-full h-12 cloud-input"
                  />
                </div>
                
                <div className="p-4 rounded-lg flex items-center gap-3" 
                  style={{ background: 'var(--cloud-surface)', border: '1px solid var(--cloud-border)' }}>
                  <Shield size={20} style={{ color: 'var(--cloud-orange)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--cloud-text-primary)' }}>
                      We'll verify your coverage automatically
                    </p>
                    <p className="text-xs" style={{ color: 'var(--cloud-text-secondary)' }}>
                      Your information is encrypted and HIPAA compliant
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--cloud-text-primary)' }}>
                  What are your primary healthcare goals?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Preventive Care",
                    "Chronic Condition Management",
                    "Mental Health Support",
                    "Fitness & Wellness",
                    "Specialist Consultations",
                    "Medication Management"
                  ].map((goal) => (
                    <button
                      key={goal}
                      onClick={() => toggleHealthGoal(goal)}
                      className={`p-4 rounded-lg text-left transition-all duration-200 ${
                        formData.healthGoals.includes(goal)
                          ? 'border-2'
                          : 'border'
                      }`}
                      style={{
                        background: formData.healthGoals.includes(goal)
                          ? 'rgba(255, 107, 53, 0.1)'
                          : 'var(--cloud-surface)',
                        borderColor: formData.healthGoals.includes(goal)
                          ? 'var(--cloud-orange)'
                          : 'var(--cloud-border)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full transition-all duration-200 ${
                          formData.healthGoals.includes(goal)
                            ? 'bg-orange-500'
                            : 'bg-gray-600'
                        }`} />
                        <span className="font-medium" style={{ color: 'var(--cloud-text-primary)' }}>
                          {goal}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              onClick={handleBack}
              disabled={currentStep === 0}
              variant="outline"
              className="flex items-center gap-2 cloud-button-secondary"
              style={{
                opacity: currentStep === 0 ? 0.5 : 1
              }}
            >
              <ArrowLeft size={16} />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex items-center gap-2 cloud-button"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="loading-spinner"></div>
                  <span>Setting up...</span>
                </div>
              ) : (
                <>
                  {currentStep === steps.length - 1 ? "Complete Setup" : "Continue"}
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
