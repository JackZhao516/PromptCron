import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { PromptSchedule } from '../types';

// Common timezones
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland'
];

interface ScheduleFormProps {
  onSubmit: (schedule: PromptSchedule) => void;
}

export interface FormData {
  id: string;
  email_title: string;
  emails: string[];
  prompt: string;
  promptVariables: Record<string, string[]>;
  schedule: {
    type: 'daily' | 'weekly';
    time: string;
    timezone: string;
    days?: string[];
  };
  start_date?: string;
  end_date?: string;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    emails: '',
    prompt: '',
    email_title: '',
    scheduleType: 'daily',
    time: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    days: [] as string[],
    prompt_variables: {} as { [key: string]: string[] },
    start_date: '',
    end_date: ''
  });

  const [emailList, setEmailList] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [newVariableValue, setNewVariableValue] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Extract variables from both prompt and email title
    const promptMatches = formData.prompt.match(/{{([^}]+)}}/g) || [];
    const titleMatches = formData.email_title.match(/{{([^}]+)}}/g) || [];
    const allMatches = Array.from(new Set([...promptMatches, ...titleMatches]));
    const newVars = allMatches.map(match => match.slice(2, -2));
    setVariables(newVars);

    // Initialize or update prompt_variables
    const newPromptVariables = { ...formData.prompt_variables };
    newVars.forEach(variable => {
      if (!newPromptVariables[variable]) {
        newPromptVariables[variable] = [];
      }
    });
    
    // Remove variables that no longer exist
    Object.keys(newPromptVariables).forEach(key => {
      if (!newVars.includes(key)) {
        delete newPromptVariables[key];
      }
    });

    setFormData(prev => ({ ...prev, prompt_variables: newPromptVariables }));
    
    // Initialize newVariableValue state for all variables
    const newVarValues = { ...newVariableValue };
    newVars.forEach(variable => {
      if (!newVarValues[variable]) {
        newVarValues[variable] = '';
      }
    });
    setNewVariableValue(newVarValues);
  }, [formData.prompt, formData.email_title]);

  const handleAddVariableValue = (variable: string) => {
    if (!newVariableValue[variable]) return;
    
    setFormData(prev => ({
      ...prev,
      prompt_variables: {
        ...prev.prompt_variables,
        [variable]: [...(prev.prompt_variables[variable] || []), newVariableValue[variable]]
      }
    }));
    
    setNewVariableValue(prev => ({
      ...prev,
      [variable]: ''
    }));
  };

  const handleRemoveVariableValue = (variable: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      prompt_variables: {
        ...prev.prompt_variables,
        [variable]: prev.prompt_variables[variable].filter((_, i) => i !== index)
      }
    }));
  };

  const handleAddEmail = () => {
    if (!newEmail) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setEmailList([...emailList, newEmail]);
    setNewEmail('');
  };

  const handleRemoveEmail = (email: string) => {
    setEmailList(emailList.filter(e => e !== email));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate emails
    if (emailList.length === 0) {
      toast.error('Please add at least one email address');
      return;
    }

    // Validate prompt variables
    if (Object.values(formData.prompt_variables).some(values => values.length === 0)) {
      toast.error('Please add at least one value for each variable');
      return;
    }

    // Validate dates if provided
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (start >= end) {
        toast.error('End date must be after start date');
        return;
      }
    }

    const schedule: PromptSchedule = {
      id: uuidv4(),
      emails: emailList,
      prompt: formData.prompt,
      email_title: formData.email_title,
      prompt_variables: formData.prompt_variables,
      schedule: {
        type: formData.scheduleType as 'daily' | 'weekly',
        time: formData.time,
        timezone: formData.timezone,
        ...(formData.scheduleType === 'weekly' ? { days: formData.days } : {})
      }
    };

    if (formData.start_date) {
      schedule.start_date = new Date(formData.start_date).toISOString();
    }
    if (formData.end_date) {
      schedule.end_date = new Date(formData.end_date).toISOString();
    }

    onSubmit(schedule);
    
    // Reset form
    setFormData({
      emails: '',
      prompt: '',
      email_title: '',
      scheduleType: 'daily',
      time: '09:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      days: [],
      prompt_variables: {},
      start_date: '',
      end_date: ''
    });
    setEmailList([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Add Email Addresses
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="user@example.com"
          />
          <button
            type="button"
            onClick={handleAddEmail}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Remember to click the Add button after entering each email address.
        </p>
        {emailList.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {emailList.map((email, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {email}
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(email)}
                  className="ml-1 text-blue-400 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {`Email Title (use {{variable}} for variables)`}
        </label>
        <input
          type="text"
          value={formData.email_title}
          onChange={e => setFormData(prev => ({ ...prev, email_title: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Daily Stock Price Alert for {{stock_symbol}}"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {`Prompt (use {{variable}} for variables)`}
        </label>
        <textarea
          value={formData.prompt}
          onChange={e => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          rows={4}
          placeholder="What is today's stock price for {{stock_symbol}}?"
          required
        />
      </div>

      {variables.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Prompt Variables</h3>
          {variables.map(variable => (
            <div key={variable} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {variable}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newVariableValue[variable] || ''}
                  onChange={e => setNewVariableValue(prev => ({
                    ...prev,
                    [variable]: e.target.value
                  }))}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder={`Add value for ${variable}`}
                />
                <button
                  type="button"
                  onClick={() => handleAddVariableValue(variable)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Remember to click the Add button after entering the prompt variable value.
              </p>
              {formData.prompt_variables[variable]?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.prompt_variables[variable].map((value, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {value}
                      <button
                        type="button"
                        onClick={() => handleRemoveVariableValue(variable, index)}
                        className="ml-1 text-blue-400 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Time Settings</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Schedule Type
            </label>
            <select
              value={formData.scheduleType}
              onChange={e => setFormData(prev => ({ ...prev, scheduleType: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Time (24-hour)
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={e => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formData.scheduleType === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Days</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-7">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <label key={day} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.days.includes(day.toLowerCase())}
                    onChange={e => {
                      const newDays = e.target.checked
                        ? [...formData.days, day.toLowerCase()]
                        : formData.days.filter(d => d !== day.toLowerCase());
                      setFormData(prev => ({ ...prev, days: newDays }));
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{day}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.start_date}
              onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.end_date}
              onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
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