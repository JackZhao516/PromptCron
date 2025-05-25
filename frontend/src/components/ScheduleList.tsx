import React, { useState, useMemo } from 'react';
import { PromptSchedule, SortField, SortOrder } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';

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
        result = result.filter(schedule => 
          schedule.emails.some(email => email.toLowerCase().includes(searchLower))
        );
      } else {
        result = result.filter(schedule => 
          schedule.emailTitle.toLowerCase().includes(searchLower)
        );
      }
    }

    // Sort by title
    result.sort((a, b) => 
      sortOrder === 'asc' 
        ? a.emailTitle.localeCompare(b.emailTitle)
        : b.emailTitle.localeCompare(a.emailTitle)
    );

    return result;
  }, [schedules, searchTerm, searchType, sortOrder]);

  const getScheduleText = (schedule: PromptSchedule) => {
    if (schedule.schedule.type === 'daily') {
      return `Daily at ${schedule.schedule.time} (${schedule.schedule.timezone})`;
    } else {
      const days = schedule.schedule.days?.join(', ') || 'Monday';
      return `Weekly on ${days} at ${schedule.schedule.time} (${schedule.schedule.timezone})`;
    }
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
            <div className="space-y-1 flex-grow">
              <h3 className="font-medium text-gray-900">{schedule.emailTitle}</h3>
              <div className="flex flex-wrap gap-2">
                {schedule.emails.map((email, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {email}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600">{getScheduleText(schedule)}</p>
            </div>
            <button
              onClick={() => onDelete(schedule.id)}
              className="ml-4 text-gray-400 hover:text-red-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Prompt:</span>{' '}
              {schedule.prompt}
            </p>
          </div>

          {Object.entries(schedule.promptVariables).length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-1">Variables:</p>
              <ul className="list-disc list-inside space-y-1">
                {Object.entries(schedule.promptVariables).map(([variable, values]) => (
                  <li key={variable} className="text-sm text-gray-600">
                    <span className="font-medium">{variable}:</span>{' '}
                    {values.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ScheduleList; 