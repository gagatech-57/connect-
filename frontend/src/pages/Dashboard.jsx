import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore.js';
import Sidebar from '../components/Sidebar.jsx';
import ChatArea from '../components/ChatArea.jsx';
import GroupModal from '../components/GroupModal.jsx';
import ProfileDrawer from '../components/ProfileDrawer.jsx';
import GroupDetails from '../components/GroupDetails.jsx';
import SocialSidebar from '../components/SocialSidebar.jsx';
import SettingsSidebar from '../components/SettingsSidebar.jsx';

export default function Dashboard() {
  const { connectSocket, disconnectSocket, activeConversation } = useChatStore();
  const [sidebarView, setSidebarView] = useState('chats'); // 'chats', 'friends', 'settings'
  
  // Modal / Drawer open states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);

  // Connect sockets and ask notification permissions on launch
  useEffect(() => {
    connectSocket();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket]);

  return (
    <div className="w-screen h-screen flex bg-slate-100 dark:bg-dark-bg transition-colors duration-300 overflow-hidden font-sans">
      
      {/* Sidebar Area (Left Pane) */}
      <div className="h-full flex-shrink-0 flex">
        {sidebarView === 'chats' && (
          <Sidebar
            setSidebarView={setSidebarView}
            setShowGroupModal={setShowGroupModal}
            setProfileDrawerOpen={setProfileDrawerOpen}
          />
        )}
        {sidebarView === 'friends' && (
          <SocialSidebar onClose={() => setSidebarView('chats')} />
        )}
        {sidebarView === 'settings' && (
          <SettingsSidebar onClose={() => setSidebarView('chats')} />
        )}
      </div>

      {/* Main Chat Area (Right Pane) */}
      <ChatArea
        setShowGroupDetails={setShowGroupDetails}
        setProfileDrawerOpen={setProfileDrawerOpen}
      />

      {/* Modals & Sliding Drawers Overlay Panel */}
      <GroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
      />

      <ProfileDrawer
        isOpen={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
      />

      <GroupDetails
        isOpen={showGroupDetails}
        onClose={() => setShowGroupDetails(false)}
      />
    </div>
  );
}
