import React, { useState, useMemo } from 'react';
import { PromptSchedule, SortOrder } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface ScheduleListProps {
  schedules: PromptSchedule[];
  onDelete: (id: string) => void;
}

const ScheduleList: React.FC<ScheduleListProps> = ({ schedules, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'title'>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const filteredAndSortedSchedules = useMemo(() => {
    let result = [...schedules];

    // Filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (searchType === 'email') {
        result = result.filter(schedule => {
          const emails = Array.isArray(schedule.emails) 
            ? schedule.emails 
            : typeof schedule.emails === 'string' 
              ? JSON.parse(schedule.emails) 
              : [];
          return emails.some((email: string) => email.toLowerCase().includes(searchLower));
        });
      } else {
        result = result.filter(schedule => 
          schedule.email_title.toLowerCase().includes(searchLower)
        );
      }
    }

    // Sort by title
    result.sort((a, b) => 
      sortOrder === 'asc' 
        ? a.email_title.localeCompare(b.email_title)
        : b.email_title.localeCompare(a.email_title)
    );

    return result;
  }, [schedules, searchTerm, searchType, sortOrder]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return 'Invalid date';
    }
  };

  const getEmails = (schedule: PromptSchedule): string[] => {
    try {
      if (Array.isArray(schedule.emails)) {
        return schedule.emails;
      }
      if (typeof schedule.emails === 'string') {
        return JSON.parse(schedule.emails);
      }
      return [];
    } catch (e) {
      console.error('Error parsing emails:', e);
      return [];
    }
  };

  const formatScheduleType = (schedule: PromptSchedule) => {
    const type = schedule.schedule?.type || 'Not set';
    const time = schedule.schedule?.time || 'Not set';
    const timezone = schedule.schedule?.timezone || 'UTC';
    return `${type.charAt(0).toUpperCase() + type.slice(1)} at ${time} ${timezone}`;
  };

  if (schedules.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No schedules created yet. Create your first schedule above!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center mb-6">
        <div className="flex-1 flex gap-2">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'email' | 'title')}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="title">Search by Title</option>
            <option value="email">Search by Email</option>
          </select>
          <input
            type="text"
            placeholder={`Search by ${searchType}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-1 rounded bg-indigo-100 text-indigo-700"
        >
          Title {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {filteredAndSortedSchedules.map((schedule) => (
        <div
          key={schedule.id}
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-grow">
              <div>
                <h3 className="font-medium text-gray-900">
                  Title: {schedule.email_title || 'Untitled'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">ID: {schedule.id}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Schedule:</p>
                <p className="text-sm text-gray-600">{formatScheduleType(schedule)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Recipients:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {getEmails(schedule).map((email, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {email}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Date Range:</p>
                <p className="text-sm text-gray-600">
                  Start: {formatDate(schedule.start_date)}<br />
                  End: {formatDate(schedule.end_date)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Prompt:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {schedule.prompt}
                </p>
              </div>

              {Object.entries(schedule.prompt_variables || {}).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Variables:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(schedule.prompt_variables || {}).map(([variable, values]) => (
                      <li key={variable} className="text-sm text-gray-600">
                        <span className="font-medium">{variable}:</span>{' '}
                        {Array.isArray(values) ? values.join(', ') : values}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <button
              onClick={() => onDelete(schedule.id)}
              className="ml-4 text-gray-400 hover:text-red-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ScheduleList; 