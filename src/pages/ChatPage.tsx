import { Send, ArrowLeft, Paperclip, Image, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

const ChatPage: React.FC = () => {
  const [senderRoles, setSenderRoles] = useState<Record<string, string>>({});

  // Load the messages
  const loadMessages = async () => {
    //... other code 
    setMessages((msgs as Message[]) || []);
    // Fetch sender roles so we can show admin/subadmin badge on their messages
    const uniqueSenders = [...new Set((msgs || []).map((m: any) => m.sender_id))];
    if (uniqueSenders.length > 0) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", uniqueSenders);
      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
      setSenderRoles(roleMap);
    }
  };

  return (
    <div>
      {/* Message render loop */}
      {messages.map((msg) => {
        const isMine       = msg.sender_id === user?.id;
        const showActions  = canEditOrDelete(msg);
        const senderRole   = senderRoles[msg.sender_id];
        const isAdminSender = senderRole === "super_admin" || senderRole === "admin" || senderRole === "sub_admin";

        return (
          <div key={msg.id}>
            {/* Message content here */}
            {!isMine && isAdminSender && (
              <div className="flex items-center gap-1 text-[10px] text-primary mb-0.5">
                <ShieldAlert className="h-3 w-3" />
                <span className="font-medium">
                  {senderRole === "super_admin" ? "Super Admin" : "Campus Admin"}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ChatPage;