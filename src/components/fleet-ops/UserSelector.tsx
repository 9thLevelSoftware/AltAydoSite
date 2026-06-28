'use client';

import React, { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  aydoHandle: string;
  role?: string;
  division?: string | null;
}

interface UserSelectorProps {
  users: User[];
  onSelectUser: (userId: string) => void;
  isLoading?: boolean;
  existingParticipantIds?: string[];
}

const UserSelector: React.FC<UserSelectorProps> = ({
  users,
  onSelectUser,
  isLoading = false,
  existingParticipantIds = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when a pointer/mouse press lands outside the selector
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isDropdownOpen]);

  // Filter users based on search term and exclude existing participants
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers([]);
      return;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = users
      .filter(
        (user) =>
          !existingParticipantIds.includes(user.id) &&
          (user.aydoHandle.toLowerCase().includes(lowerSearchTerm) ||
            (user.division && user.division.toLowerCase().includes(lowerSearchTerm)))
      )
      .slice(0, 10); // Limit results

    setFilteredUsers(filtered);
  }, [searchTerm, users, existingParticipantIds]);

  // Handle user selection
  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-2">
        <input
          type="text"
          className="mg-input flex-grow"
          placeholder="Search users by handle or division..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
        />
      </div>

      {isDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-[rgba(var(--mg-panel-dark),0.95)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="mg-loader mx-auto"></div>
              <p className="mg-text-secondary mt-2">Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <ul>
              {filteredUsers.map((user) => (
                <li
                  key={user.id}
                  className="hover:bg-[rgba(var(--mg-primary),0.1)] cursor-pointer"
                  onClick={() => handleSelectUser(user.id)}
                >
                  <div className="p-2">
                    <div className="font-medium">{user.aydoHandle}</div>
                    <div className="text-sm mg-text-secondary">
                      {user.role}
                      {user.division ? ` • ${user.division}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : searchTerm.trim() !== '' ? (
            <div className="p-4 mg-text-secondary text-center">No matching users found</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default UserSelector;
