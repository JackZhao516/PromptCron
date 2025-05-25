import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PromptSchedule, ScheduleFormData, ScheduleType } from '../types';

interface ScheduleFormProps {
  onSubmit: (schedule: PromptSchedule) => void;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Common timezone list covering major regions
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland'
];

const ScheduleForm: React.FC<ScheduleFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<ScheduleFormData>({
    emails: [''],
    prompt: '',
    emailTitle: '',
    promptVariables: {},
    scheduleType: 'daily',
    time: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    selectedDays: []
  });

  const [extractedVariables, setExtractedVariables] = useState<string[]>([]);

  useEffect(() => {
    // Extract variables from both prompt and email title
    const promptMatches = formData.prompt.match(/{{([^}]+)}}/g) || [];
    const titleMatches = formData.emailTitle.match(/{{([^}]+)}}/g) || [];
    const allMatches = Array.from(new Set([...promptMatches, ...titleMatches]));
    const variables = allMatches.map(match => match.slice(2, -2));
    
    // Initialize new variables with empty arrays
    const newVariables = { ...formData.promptVariables };
    variables.forEach(variable => {
      if (!newVariables[variable]) {
        newVariables[variable] = [''];
      }
    });

    // Remove variables that are no longer in use
    Object.keys(newVariables).forEach(key => {
      if (!variables.includes(key)) {
        delete newVariables[key];
      }
    });

    setFormData(prev => ({ ...prev, promptVariables: newVariables }));
    setExtractedVariables(variables);
  }, [formData.prompt, formData.emailTitle]);

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...formData.emails];
    newEmails[index] = value;
    setFormData({ ...formData, emails: newEmails });
  };

  const addEmailField = () => {
    setFormData({ ...formData, emails: [...formData.emails, ''] });
  };

  const removeEmailField = (index: number) => {
    const newEmails = formData.emails.filter((_, i) => i !== index);
    setFormData({ ...formData, emails: newEmails });
  };

  const handleVariableValueChange = (variable: string, index: number, value: string) => {
    const values = [...(formData.promptVariables[variable] || [])];
    values[index] = value;
    setFormData({
      ...formData,
      promptVariables: {
        ...formData.promptVariables,
        [variable]: values
      }
    });
  };

  const addVariableValue = (variable: string) => {
    const values = [...(formData.promptVariables[variable] || []), ''];
    setFormData({
      ...formData,
      promptVariables: {
        ...formData.promptVariables,
        [variable]: values
      }
    });
  };

  const removeVariableValue = (variable: string, index: number) => {
    const values = formData.promptVariables[variable].filter((_, i) => i !== index);
    setFormData({
      ...formData,
      promptVariables: {
        ...formData.promptVariables,
        [variable]: values
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.emails.some(email => !email)) {
      toast.error('Please fill in all email fields');
      return;
    }

    if (!formData.prompt) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!formData.emailTitle) {
      toast.error('Please enter an email title');
      return;
    }

    if (formData.scheduleType === 'weekly' && formData.selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    // Validate that all variables have at least one value
    const missingVariables = extractedVariables.filter(
      variable => !formData.promptVariables[variable]?.length
    );
    if (missingVariables.length > 0) {
      toast.error(`Please add values for: ${missingVariables.join(', ')}`);
      return;
    }

    const newSchedule: PromptSchedule = {
      id: Date.now().toString(),
      emails: formData.emails,
      prompt: formData.prompt,
      emailTitle: formData.emailTitle,
      promptVariables: formData.promptVariables,
      schedule: {
        type: formData.scheduleType,
        time: formData.time,
        timezone: formData.timezone,
        ...(formData.scheduleType === 'weekly' && { days: formData.selectedDays })
      }
    };

    onSubmit(newSchedule);
    toast.success('Schedule created successfully!');
    
    // Reset form
    setFormData({
      emails: [''],
      prompt: '',
      emailTitle: '',
      promptVariables: {},
      scheduleType: 'daily',
      time: '09:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      selectedDays: []
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Email Addresses
        </label>
        {formData.emails.map((email, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(index, e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
            {index > 0 && (
              <button
                type="button"
                onClick={() => removeEmailField(index)}
                className="inline-flex items-center rounded-md border border-transparent bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addEmailField}
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200"
        >
          Add Email
        </button>
      </div>

      <div>
        <label htmlFor="emailTitle" className="block text-sm font-medium text-gray-700">
          Email Title
        </label>
        <div className="mt-1 text-sm text-gray-500">
          You can use variables like {"{{"}<span>variable_name</span>{"}}"}
        </div>
        <input
          id="emailTitle"
          type="text"
          value={formData.emailTitle}
          onChange={(e) => setFormData({ ...formData, emailTitle: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
          AI Prompt Template
        </label>
        <div className="mt-1 text-sm text-gray-500">
          <span>Use variables like {"{{"}<span>variable_name</span>{"}}"}</span>
        </div>
        <textarea
          id="prompt"
          value={formData.prompt}
          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>

      {extractedVariables.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Variable Values</h3>
          {extractedVariables.map(variable => (
            <div key={variable} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {variable}
              </label>
              {formData.promptVariables[variable]?.map((value, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleVariableValueChange(variable, index, e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeVariableValue(variable, index)}
                      className="inline-flex items-center rounded-md border border-transparent bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addVariableValue(variable)}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200"
              >
                Add Value
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Schedule Type</label>
        <select
          value={formData.scheduleType}
          onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value as ScheduleType })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {formData.scheduleType === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Days
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {DAYS_OF_WEEK.map((day) => (
              <label key={day} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formData.selectedDays.includes(day.toLowerCase())}
                  onChange={(e) => {
                    const days = e.target.checked
                      ? [...formData.selectedDays, day.toLowerCase()]
                      : formData.selectedDays.filter(d => d !== day.toLowerCase());
                    setFormData({ ...formData, selectedDays: days });
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-600">{day}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">
            Time
          </label>
          <input
            type="time"
            id="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {TIMEZONES.map((timezone: string) => (
              <option key={timezone} value={timezone}>
                {timezone.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Create Schedule
        </button>
      </div>
    </form>
  );
};

export default ScheduleForm; 