/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContainer,
  Heading,
  Content,
  Divider,
  Button,
  Text
} from '@react-spectrum/s2';

interface AddEdsWidgetWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddEdsWidgetWizard({
  isOpen,
  onClose
}: AddEdsWidgetWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Reset wizard state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as 1 | 2 | 3);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    }
  };

  const handleComplete = () => {
    // TODO: Implement widget creation logic
    onClose();
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Step 1 - Widget Configuration';
      case 2: return 'Step 2 - Widget Details';
      case 3: return 'Step 3 - Review & Complete';
      default: return '';
    }
  };

  const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor 
  in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.`;

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog isDismissible UNSAFE_style={{ width: '70vw', maxWidth: '70vw' }}>
          <Heading>{getStepTitle()}</Heading>
          <Divider />
          <Content UNSAFE_style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
            {/* Scrollable Content Area */}
            <div style={{ flex: 1, overflow: 'auto', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
                {/* Step 1 Content */}
                {step === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Heading level={4}>Widget Configuration</Heading>
                    <Text>{loremIpsum}</Text>
                    <Text>
                      Configure your EDS Widget by specifying the widget name, type, and initial
                      properties. This step sets up the basic configuration that will be used in
                      subsequent steps.
                    </Text>
                  </div>
                )}

                {/* Step 2 Content */}
                {step === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Heading level={4}>Widget Details</Heading>
                    <Text>{loremIpsum}</Text>
                    <Text>
                      Customize the widget appearance and behavior by setting visual properties,
                      layout options, and user interaction settings. These details determine how
                      the widget will be displayed to end users.
                    </Text>
                  </div>
                )}

                {/* Step 3 Content */}
                {step === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Heading level={4}>Review & Complete</Heading>
                    <Text>{loremIpsum}</Text>
                    <Text>
                      Review the configuration and details you've entered for the EDS Widget.
                      Once you click Complete, the widget will be created and added to your
                      action. You can edit it later if needed.
                    </Text>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'space-between' }}>
              <div>
                {step > 1 && (
                  <Button variant="secondary" onPress={handlePrev}>
                    Previous
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                <Button variant="secondary" onPress={onClose}>
                  Cancel
                </Button>
                {step < 3 ? (
                  <Button variant="accent" onPress={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button variant="accent" onPress={handleComplete}>
                    Complete
                  </Button>
                )}
              </div>
            </div>
          </Content>
        </Dialog>
      )}
    </DialogContainer>
  );
}

