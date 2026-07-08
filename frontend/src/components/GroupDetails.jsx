import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import api from '../services/api.js';
import { X, Users, UserPlus, UserCheck, Shield, Ban, LogOut, Trash2, Loader2, Info } from 'lucide-react';

export default function GroupDetails({ isOpen, onClose }) {
  const { user } = useAuthStore();
  const { activeConversation, selectConversation, fetchConversations } = useChatStore();

  const [friends, setFriends] = useState([]);
  const [selectedForAdd, setSelectedForAdd] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const group = activeConversation?.group;
  
  // Fetch friends list to allow adding them
  useEffect(() => {
    if (isOpen && showAddMenu) {
      const fetchFriends = async () => {
        setIsFriendsLoading(true);
        try {
          const res = await api.get('/friends');
          // Filter out users who are already group members
          const filtered = (res.data.friends || []).filter(
            (f) => !group.members.some((m) => m._id === f._id)
          );
          setFriends(filtered);
        } catch (err) {
          console.error(err);
        } finally {
          setIsFriendsLoading(false);
        }
      };
      fetchFriends();
      setSelectedForAdd([]);
    }
  }, [isOpen, showAddMenu]);

  if (!isOpen || !activeConversation || !activeConversation.isGroup || !group) return null;

  const isCreator = group.creator._id === user._id || group.creator === user._id;
  const isAdmin = group.admins.some((a) => a._id === user._id || a === user._id);

  const handleAddMembersSubmit = async (e) => {
    e.preventDefault();
    if (selectedForAdd.length === 0) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/groups/${group._id}/members`, {
        memberIds: selectedForAdd,
      });
      
      // Update active conversation in store
      await fetchConversations();
      const updated = useChatStore.getState().conversations;
      const matched = updated.find((c) => c._id === activeConversation._id);
      if (matched) selectConversation(matched);
      
      setShowAddMenu(false);
      alert('Members added successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add members');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteAdmin = async (memberId) => {
    setActionLoading(true);
    try {
      await api.put(`/groups/${group._id}/admin/promote`, { userId: memberId });
      await refreshGroupDetails();
      alert('Member promoted to admin');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to promote member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemoteAdmin = async (memberId) => {
    setActionLoading(true);
    try {
      await api.put(`/groups/${group._id}/admin/demote`, { userId: memberId });
      await refreshGroupDetails();
      alert('Admin demoted to member');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to demote admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/groups/${group._id}/members`, { data: { userIdToRemove: memberId } });
      await refreshGroupDetails();
      alert('Member removed');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/groups/${group._id}/leave`);
      selectConversation(null);
      await fetchConversations();
      onClose();
      alert('You left the group');
    } catch (err) {
      alert('Failed to leave group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('CRITICAL: Are you sure you want to delete this group? All messages and attachments will be deleted forever.')) return;
    setActionLoading(true);
    try {
      await api.delete(`/groups/${group._id}`);
      selectConversation(null);
      await fetchConversations();
      onClose();
      alert('Group deleted successfully');
    } catch (err) {
      alert('Failed to delete group');
    } finally {
      setActionLoading(false);
    }
  };

  const refreshGroupDetails = async () => {
    await fetchConversations();
    const updated = useChatStore.getState().conversations;
    const matched = updated.find((c) => c._id === activeConversation._id);
    if (matched) selectConversation(matched);
  };

  const handleToggleForAdd = (friendId) => {
    if (selectedForAdd.includes(friendId)) {
      setSelectedForAdd(selectedForAdd.filter((id) => id !== friendId));
    } else {
      setSelectedForAdd([...selectedForAdd, friendId]);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-white dark:bg-dark-card border-l border-slate-200 dark:border-dark-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 transition-colors">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-dark-border flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-500" />
          Group Info
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-bg rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Info Card */}
        <div className="flex flex-col items-center text-center">
          <img
            src={group.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${group.name}`}
            alt="Group Avatar"
            className="w-20 h-20 rounded-3xl object-cover border border-slate-200 dark:border-dark-border"
          />
          <h4 className="text-base font-bold text-slate-800 dark:text-white mt-3">{group.name}</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">{group.description || 'No description provided'}</p>
        </div>

        {/* Action Panel */}
        {isAdmin && !showAddMenu && (
          <button
            onClick={() => setShowAddMenu(true)}
            className="w-full py-2 bg-brand-50 dark:bg-brand-950/20 text-brand-500 rounded-xl text-xs font-bold transition-all border border-brand-200/50 flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Add New Members
          </button>
        )}

        {/* Add Members UI overlay block */}
        {showAddMenu && (
          <form onSubmit={handleAddMembersSubmit} className="space-y-3 bg-slate-50 dark:bg-dark-bg p-3.5 rounded-2xl border border-slate-200/40 dark:border-dark-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500">SELECT FRIENDS TO ADD</span>
              <button
                type="button"
                onClick={() => setShowAddMenu(false)}
                className="text-[10px] font-bold text-rose-500 hover:underline"
              >
                Close
              </button>
            </div>

            <div className="border border-slate-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card max-h-40 overflow-y-auto divide-y divide-slate-50 dark:divide-dark-border/40">
              {isFriendsLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                </div>
              ) : friends.length > 0 ? (
                friends.map((friend) => (
                  <label key={friend._id} className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <img src={friend.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${friend.fullName}`} alt="" className="w-6 h-6 rounded-md" />
                      <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{friend.fullName}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedForAdd.includes(friend._id)}
                      onChange={() => handleToggleForAdd(friend._id)}
                      className="w-4 h-4 text-brand-500 border-slate-300 rounded cursor-pointer"
                    />
                  </label>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 p-3 text-center">No addable friends found</p>
              )}
            </div>

            <button
              type="submit"
              disabled={selectedForAdd.length === 0 || actionLoading}
              className="w-full py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              Add Members
            </button>
          </form>
        )}

        {/* Members List */}
        <div className="space-y-3">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            MEMBERS ({group.members.length})
          </h5>

          <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-dark-border/20 max-h-64 overflow-y-auto">
            {group.members.map((member) => {
              const isMemCreator = group.creator._id === member._id || group.creator === member._id;
              const isMemAdmin = group.admins.some((a) => a._id === member._id || a === member._id);
              const isSelf = member._id === user._id;

              return (
                <div key={member._id} className="flex items-center justify-between pt-2.5 first:pt-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.fullName}`}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {member.fullName} {isSelf && '(You)'}
                      </p>
                      
                      <div className="flex gap-1 mt-0.5">
                        {isMemCreator && (
                          <span className="text-[8px] px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border border-indigo-200/50 rounded font-bold uppercase tracking-wide">
                            Creator
                          </span>
                        )}
                        {isMemAdmin && !isMemCreator && (
                          <span className="text-[8px] px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border border-emerald-200/50 rounded font-bold uppercase tracking-wide flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" />
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for member */}
                  {isAdmin && !isSelf && !isMemCreator && (
                    <div className="flex items-center gap-1">
                      {isMemAdmin ? (
                        <button
                          onClick={() => handleDemoteAdmin(member._id)}
                          className="px-2 py-1 text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded"
                          title="Demote to Member"
                        >
                          Demote
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromoteAdmin(member._id)}
                          className="px-2 py-1 text-[9px] font-bold text-brand-500 bg-brand-50 hover:bg-brand-500 hover:text-white rounded"
                          title="Promote to Admin"
                        >
                          Promote
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded"
                        title="Remove Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave/Delete Group Section */}
        <div className="space-y-2 border-t border-slate-100 dark:border-dark-border pt-4">
          <button
            onClick={handleLeaveGroup}
            disabled={actionLoading}
            className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-200/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4.5 h-4.5" />
            Leave Group
          </button>
          
          {isCreator && (
            <button
              onClick={handleDeleteGroup}
              disabled={actionLoading}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/10"
            >
              <Trash2 className="w-4.5 h-4.5" />
              Delete Group Chat
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
