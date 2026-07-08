import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import EmojiPicker from 'emoji-picker-react';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Square,
  X,
  MoreVertical,
  Reply,
  Trash2,
  Edit3,
  Star,
  Pin,
  Download,
  Info,
  Check,
  CheckCheck,
  CornerDownRight,
  SmilePlus,
  Loader2,
  FileText,
  MessageSquare
} from 'lucide-react';

export default function ChatArea({ setShowGroupDetails, setProfileDrawerOpen }) {
  const { user } = useAuthStore();
  const {
    activeConversation,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePinMessage,
    toggleStarMessage,
    addReaction,
    removeReaction,
    sendTypingIndicator,
    typingUsers,
    onlineUserIds,
    toggleMuteConversation,
    toggleArchiveConversation,
    togglePinConversation
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [replyMessage, setReplyMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Click outside to close message context menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuMessageId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Typing indicator debounce
  const typingTimer = useRef(null);
  const handleTextChange = (e) => {
    setInputText(e.target.value);

    // Send typing status
    sendTypingIndicator(true);

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 1500);
  };

  // Handle Drag & Drop files
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(''); // Non-image file preview is handled by layout icon
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send Action
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    try {
      if (editingMessage) {
        // Edit message
        await editMessage(editingMessage._id, inputText);
        setEditingMessage(null);
      } else {
        // Send normal message
        await sendMessage(
          inputText,
          selectedFile,
          replyMessage ? replyMessage._id : null
        );
        setReplyMessage(null);
      }
      setInputText('');
      handleRemoveFile();
      setShowEmojiPicker(false);
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    }
  };

  // Audio Recording helpers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
        
        // Send voice message immediately
        try {
          await sendMessage('', file, replyMessage ? replyMessage._id : null);
          setReplyMessage(null);
        } catch (err) {
          alert('Failed to send voice message');
        }

        // Close tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      // Timer setup
      setRecordingDuration(0);
      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Failed to access microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(recordingTimer.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.onstop = null; // Prevent sending message
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(recordingTimer.current);
    }
  };

  // Format recording durations (MM:SS)
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecipient = () => {
    if (!activeConversation || activeConversation.isGroup) return null;
    return activeConversation.participants.find((p) => p._id !== user._id);
  };

  const recipient = getRecipient();
  const isOnline = recipient ? onlineUserIds.includes(recipient._id) || recipient.onlineStatus : false;
  
  // Format last seen timestamp
  const formatLastSeen = (dateStr) => {
    if (!dateStr) return 'Offline';
    const date = new Date(dateStr);
    return `Last seen ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const activeTypers = activeConversation ? typingUsers[activeConversation._id] || [] : [];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 h-full flex flex-col bg-slate-50 dark:bg-dark-bg transition-colors duration-300 relative ${
        isDragOver ? 'ring-4 ring-brand-500 ring-inset' : ''
      }`}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-brand-500/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-dark-card border border-brand-500/30 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
            <Paperclip className="w-12 h-12 text-brand-500 animate-bounce" />
            <p className="font-bold text-slate-800 dark:text-white">Drop files to attach to chat</p>
          </div>
        </div>
      )}

      {activeConversation ? (
        <>
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={
                  activeConversation.isGroup
                    ? activeConversation.group?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${activeConversation.group?.name}`
                    : recipient?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${recipient?.fullName}`
                }
                alt="Avatar"
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-dark-border"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  {activeConversation.isGroup ? activeConversation.group?.name : recipient?.fullName}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-dark-muted truncate font-semibold">
                  {activeConversation.isGroup
                    ? `${activeConversation.participants.length} members`
                    : isOnline
                    ? 'Online'
                    : formatLastSeen(recipient?.lastSeen)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => togglePinConversation(activeConversation._id)}
                className={`p-2 rounded-lg transition-colors ${
                  activeConversation.isPinned
                    ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-bg'
                }`}
                title="Pin Chat"
              >
                <Pin className="w-4 h-4 rotate-45" />
              </button>
              <button
                onClick={() => toggleMuteConversation(activeConversation._id)}
                className={`p-2 rounded-lg transition-colors ${
                  activeConversation.isMuted
                    ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-bg'
                }`}
                title="Mute Chat"
              >
                <VolumeX className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleArchiveConversation(activeConversation._id)}
                className={`p-2 rounded-lg transition-colors ${
                  activeConversation.isArchived
                    ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/20'
                    : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-bg'
                }`}
                title="Archive Chat"
              >
                <Archive className="w-4 h-4" />
              </button>
              
              {activeConversation.isGroup && (
                <button
                  onClick={() => setShowGroupDetails(true)}
                  className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-bg rounded-lg transition-colors"
                  title="Group Info"
                >
                  <Info className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-slate-50/50 dark:bg-dark-bg/10">
            {messages.length > 0 ? (
              messages.map((msg, index) => {
                const isMe = msg.sender._id === user._id;
                const isStarred = msg.starredBy.includes(user._id);

                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative group`}
                  >
                    {/* Member name in group chats */}
                    {activeConversation.isGroup && !isMe && (
                      <span className="text-[10px] font-bold text-slate-400 dark:text-dark-muted mb-1 ml-2">
                        {msg.sender.fullName}
                      </span>
                    )}

                    {/* Message Card wrapper */}
                    <div className="flex items-end gap-1.5 max-w-[85%] relative">
                      
                      {/* Left Option Menu Trigger */}
                      {isMe && (
                        <button
                          onClick={() => setActiveMenuMessageId(msg._id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-border rounded-lg transition-all"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Bubble */}
                      <div
                        className={`p-3 rounded-2xl shadow-sm text-sm relative ${
                          isMe
                            ? 'bg-gradient-to-tr from-brand-600 to-indigo-500 text-white rounded-br-none'
                            : 'bg-white dark:bg-dark-card border border-slate-200/55 dark:border-dark-border text-slate-800 dark:text-white rounded-bl-none'
                        }`}
                      >
                        {/* Reply Banner inside bubble */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 bg-black/10 dark:bg-white/5 rounded-lg border-l-2 border-brand-400 flex items-center gap-1.5 text-2xs text-slate-200 dark:text-dark-muted">
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <div className="truncate">
                              <span className="font-bold">@{msg.replyTo.sender?.username}</span>: {msg.replyTo.text || 'Attachment'}
                            </div>
                          </div>
                        )}

                        {/* Media renderer */}
                        {msg.media && msg.media.url && (
                          <div className="mb-2 rounded-lg overflow-hidden max-w-sm">
                            {msg.media.type === 'image' && (
                              <a href={msg.media.url} target="_blank" rel="noreferrer">
                                <img src={msg.media.url} alt="Attached" className="w-full object-cover max-h-60 rounded-lg hover:opacity-95 transition-opacity" />
                              </a>
                            )}
                            {msg.media.type === 'video' && (
                              <video src={msg.media.url} controls className="w-full max-h-60 rounded-lg" />
                            )}
                            {msg.media.type === 'audio' && (
                              <audio src={msg.media.url} controls className="w-full rounded-lg" />
                            )}
                            {msg.media.type === 'document' && (
                              <div className="p-3 bg-slate-100 dark:bg-dark-border rounded-xl flex items-center justify-between gap-3 text-slate-700 dark:text-dark-text border border-slate-200 dark:border-transparent">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-8 h-8 text-brand-500 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{msg.media.name}</p>
                                    <p className="text-[10px] text-slate-400">{(msg.media.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                </div>
                                <a
                                  href={msg.media.url}
                                  download={msg.media.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-dark-bg rounded-lg text-slate-500 dark:text-dark-muted"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                        {/* Timestamp & Status inside bubble */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-75 font-semibold text-right">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.isEdited && <span className="italic">(edited)</span>}
                          {isMe && (
                            <span>
                              {msg.seenBy.length > 1 ? (
                                <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-white/50" />
                              )}
                            </span>
                          )}
                          {isStarred && <Star className="w-3 h-3 text-amber-300 fill-amber-300" />}
                          {msg.pinned && <Pin className="w-3 h-3 text-rose-300 fill-rose-300 rotate-45" />}
                        </div>

                        {/* Reactions render */}
                        {msg.reactions.length > 0 && (
                          <div className="absolute -bottom-2 right-2 flex gap-1 flex-wrap z-10">
                            {msg.reactions.map((r, rIdx) => (
                              <span
                                key={rIdx}
                                className="px-1.5 py-0.5 rounded-full bg-white dark:bg-dark-border border border-slate-200 dark:border-dark-bg/60 text-xs shadow-md"
                              >
                                {r.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right Option Menu Trigger */}
                      {!isMe && (
                        <button
                          onClick={() => setActiveMenuMessageId(msg._id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-border rounded-lg transition-all"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Context Menu Overlay */}
                    {activeMenuMessageId === msg._id && (
                      <div
                        ref={menuRef}
                        className={`absolute z-30 w-36 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl shadow-2xl py-1.5 text-xs text-slate-700 dark:text-dark-text mt-1 ${
                          isMe ? 'right-0' : 'left-0'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setReplyMessage(msg);
                            setActiveMenuMessageId(null);
                          }}
                          className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-dark-bg flex items-center gap-2 text-left"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          Reply
                        </button>
                        <button
                          onClick={async () => {
                            await toggleStarMessage(msg._id);
                            setActiveMenuMessageId(null);
                          }}
                          className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-dark-bg flex items-center gap-2 text-left"
                        >
                          <Star className="w-3.5 h-3.5" />
                          {isStarred ? 'Unstar' : 'Star'}
                        </button>
                        <button
                          onClick={async () => {
                            await togglePinMessage(msg._id);
                            setActiveMenuMessageId(null);
                          }}
                          className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-dark-bg flex items-center gap-2 text-left"
                        >
                          <Pin className="w-3.5 h-3.5 rotate-45" />
                          {msg.pinned ? 'Unpin' : 'Pin'}
                        </button>
                        {isMe && !msg.deletedForEveryone && (
                          <button
                            onClick={() => {
                              setEditingMessage(msg);
                              setInputText(msg.text);
                              setActiveMenuMessageId(null);
                            }}
                            className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-dark-bg flex items-center gap-2 text-left"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm('Delete for me?')) {
                              await deleteMessage(msg._id, 'me');
                            }
                            setActiveMenuMessageId(null);
                          }}
                          className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-dark-bg flex items-center gap-2 text-left text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete for Me
                        </button>
                        {isMe && !msg.deletedForEveryone && (
                          <button
                            onClick={async () => {
                              if (confirm('Delete for everyone?')) {
                                await deleteMessage(msg._id, 'everyone');
                              }
                              setActiveMenuMessageId(null);
                            }}
                            className="w-full px-4 py-2 hover:bg-slate-100 dark:hover:bg-dark-bg flex items-center gap-2 text-left text-rose-500 font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete for Everyone
                          </button>
                        )}
                        
                        {/* Quick reaction emojis in menu */}
                        <div className="px-3 py-1.5 border-t border-slate-100 dark:border-dark-border mt-1 flex justify-between gap-1.5">
                          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={async () => {
                                await addReaction(msg._id, emoji);
                                setActiveMenuMessageId(null);
                              }}
                              className="hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare className="w-12 h-12 opacity-30 mb-2" />
                <p className="text-sm font-semibold">Gaga Chat Workspace</p>
                <p className="text-xs opacity-75">Send a message to start conversation</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator Display */}
          {activeTypers.length > 0 && (
            <div className="px-4 py-1 text-xs italic text-brand-500 font-semibold flex items-center gap-2 bg-slate-50 dark:bg-dark-bg">
              <span className="flex gap-1 items-center">
                <span className="wave-bar quiet animate-pulse" />
                <span className="wave-bar normal animate-pulse" />
                <span className="wave-bar loud animate-pulse" />
              </span>
              <span>{activeTypers.join(', ')} is typing...</span>
            </div>
          )}

          {/* Reply Preview Bar */}
          {replyMessage && (
            <div className="px-4 py-2 bg-slate-100 dark:bg-dark-border border-t border-slate-200 dark:border-dark-border flex items-center justify-between text-xs text-slate-600 dark:text-dark-muted font-bold">
              <div className="flex items-center gap-2">
                <Reply className="w-4 h-4" />
                <span>Replying to @{replyMessage.sender.username}</span>
                <span className="font-normal truncate max-w-xs ml-1">
                  "{replyMessage.text || 'Attachment'}"
                </span>
              </div>
              <button onClick={() => setReplyMessage(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-dark-bg rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Editing Preview Bar */}
          {editingMessage && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200/50 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-bold">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                <span>Editing Message</span>
              </div>
              <button
                onClick={() => {
                  setEditingMessage(null);
                  setInputText('');
                }}
                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Panel */}
          <div className="p-4 border-t border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card transition-colors duration-300 relative">
            
            {/* Attachment preview */}
            {selectedFile && (
              <div className="mb-3 p-2 bg-slate-50 dark:bg-dark-bg rounded-xl border border-slate-200 dark:border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-200 dark:bg-dark-border rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-brand-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 bg-slate-200 dark:bg-dark-border hover:bg-rose-100 dark:hover:bg-rose-950/30 text-slate-600 dark:text-dark-text hover:text-rose-500 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Emoji picker overlay */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 left-4 z-40 shadow-2xl">
                <EmojiPicker
                  onEmojiClick={(emojiData) => setInputText((prev) => prev + emojiData.emoji)}
                  theme="auto"
                />
              </div>
            )}

            {isRecording ? (
              // Audio Recorder Panel
              <div className="flex items-center justify-between bg-slate-100 dark:bg-dark-bg p-3 rounded-2xl border border-slate-200 dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 bg-rose-500 rounded-full animate-ping" />
                  <span className="text-sm font-bold text-slate-700 dark:text-white font-mono">
                    Recording: {formatDuration(recordingDuration)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-dark-card hover:bg-rose-100 text-slate-600 dark:text-dark-text hover:text-rose-600 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/20 hover:scale-105 transition-all"
                    title="Stop & Send"
                  >
                    <Square className="w-4 h-4 fill-white" />
                  </button>
                </div>
              </div>
            ) : (
              // Normal Text Input Form
              <form onSubmit={handleSend} className="flex items-center gap-2.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-xl transition-all ${
                      showEmojiPicker
                        ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/20'
                        : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-bg'
                    }`}
                  >
                    <Smile className="w-5.5 h-5.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-bg rounded-xl transition-colors"
                  >
                    <Paperclip className="w-5.5 h-5.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelection(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Type message here..."
                  value={inputText}
                  onChange={handleTextChange}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                />

                <div className="flex items-center gap-1.5">
                  {!inputText && !selectedFile ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-2.5 bg-slate-100 dark:bg-dark-bg text-slate-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-xl transition-all shadow-sm"
                      title="Record Voice"
                    >
                      <Mic className="w-5.5 h-5.5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="p-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 hover:scale-105 transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </>
      ) : (
        // Empty placeholder state
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-dark-bg/20 p-8 text-center text-slate-400 select-none">
          <div className="w-20 h-20 bg-brand-50 dark:bg-dark-card border border-brand-100 dark:border-dark-border rounded-3xl flex items-center justify-center shadow-lg shadow-brand-500/5 mb-6">
            <MessageSquare className="w-10 h-10 text-brand-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Start Communicating</h2>
          <p className="text-sm max-w-sm mt-2 opacity-75">
            Search for colleagues or select an existing conversation room to begin real-time messaging.
          </p>
        </div>
      )}
    </div>
  );
}
