"use client";
import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Copy,
  Link,
  Mail,
  Clock,
  Users,
  Eye,
  EyeOff,
  QrCode,
  Share,
  Check,
  X,
  Calendar,
  Globe,
  Lock,
} from "lucide-react";
import type { ServerInfo } from "@/lib/firebase/chat";

interface InviteModalProps {
  server: ServerInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  server,
  isOpen,
  onClose,
  onInvite,
}) => {
  const [activeTab, setActiveTab] = useState("link");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(true);
  const [inviteExpiry, setInviteExpiry] = useState("7days");
  
  // 招待コードを生成
  const [inviteCode] = useState(() => 
    `unica-${Math.random().toString(36).substring(2, 8)}`
  );
  
  const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;

  const handleEmailInvite = async () => {
    if (!inviteEmail || !server) return;
    
    setIsInviting(true);
    try {
      await onInvite(inviteEmail, inviteRole);
      setInviteEmail("");
      alert(`${inviteEmail} に招待を送信しました`);
    } catch (error) {
      console.error('招待送信エラー:', error);
      alert('招待の送信に失敗しました');
    } finally {
      setIsInviting(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    // ここでトースト通知を表示
    alert('招待リンクをコピーしました');
  };

  const shareInviteLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `${server?.name} への招待`,
        text: `${server?.name} サーバーに参加しませんか？`,
        url: inviteUrl,
      });
    } else {
      copyInviteLink();
    }
  };

  const getExpiryText = (expiry: string) => {
    switch (expiry) {
      case '30min': return '30分後';
      case '1hour': return '1時間後';
      case '6hours': return '6時間後';
      case '12hours': return '12時間後';
      case '1day': return '1日後';
      case '7days': return '7日後';
      case '30days': return '30日後';
      case 'never': return '無期限';
      default: return '7日後';
    }
  };

  if (!server) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg dark:bg-slate-800">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 -m-6 mb-6 p-6 rounded-t-lg">
          <DialogTitle className="flex items-center space-x-2 dark:text-white">
            <UserPlus className="w-5 h-5" />
            <span>{server.name} にメンバーを招待</span>
          </DialogTitle>
          <DialogDescription>
            新しいメンバーをサーバーに招待します。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">
              <Link className="w-4 h-4 mr-2" />
              リンク
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              メール
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode className="w-4 h-4 mr-2" />
              QRコード
            </TabsTrigger>
          </TabsList>

          {/* 招待リンク */}
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {server.isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    <Label className="font-medium">
                      {server.isPrivate ? 'プライベートサーバー' : 'パブリックサーバー'}
                    </Label>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {server.memberCount}人のメンバー
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">招待リンク</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={showInviteCode ? inviteUrl : '••••••••••••••••••••••••'}
                      readOnly
                      className="font-mono text-sm dark:bg-slate-800"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInviteCode(!showInviteCode)}
                    >
                      {showInviteCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="expiry" className="text-sm">有効期限</Label>
                  <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="30min">30分後</SelectItem>
                      <SelectItem value="1hour">1時間後</SelectItem>
                      <SelectItem value="6hours">6時間後</SelectItem>
                      <SelectItem value="12hours">12時間後</SelectItem>
                      <SelectItem value="1day">1日後</SelectItem>
                      <SelectItem value="7days">7日後</SelectItem>
                      <SelectItem value="30days">30日後</SelectItem>
                      <SelectItem value="never">無期限</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-role" className="text-sm">デフォルトロール</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      <SelectItem value="guest">ゲスト</SelectItem>
                      <SelectItem value="member">メンバー</SelectItem>
                      <SelectItem value="contributor">コントリビューター</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800">
                    この招待は{getExpiryText(inviteExpiry)}に期限切れになります
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={copyInviteLink}
                  variant="outline"
                  className="flex-1"
                  disabled={!showInviteCode}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  コピー
                </Button>
                <Button
                  onClick={shareInviteLink}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!showInviteCode}
                >
                  <Share className="w-4 h-4 mr-2" />
                  共有
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* メール招待 */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">メールアドレス</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="dark:bg-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-role">ロール</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem value="guest">ゲスト</SelectItem>
                    <SelectItem value="member">メンバー</SelectItem>
                    <SelectItem value="contributor">コントリビューター</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-sm mb-2">招待メール内容</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>件名:</strong> {server.name} サーバーへの招待</p>
                  <p><strong>本文:</strong></p>
                  <div className="bg-white p-3 rounded border text-xs">
                    {server.name} サーバーに招待されました。<br/>
                    以下のリンクをクリックして参加してください:<br/>
                    <span className="text-blue-600">{inviteUrl}</span><br/><br/>
                    ロール: {inviteRole}<br/>
                    有効期限: {getExpiryText(inviteExpiry)}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleEmailInvite}
                disabled={!inviteEmail || isInviting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isInviting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    招待メールを送信
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* QRコード */}
          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-48 h-48 bg-gray-100 rounded-lg mx-auto">
                <div className="text-center">
                  <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">QRコード生成機能</p>
                  <p className="text-xs text-gray-400">近日実装予定</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>QRコードをスマートフォンで読み取ると</p>
                <p>招待リンクが開きます</p>
              </div>

              <Button
                variant="outline"
                onClick={copyInviteLink}
                className="w-full"
              >
                <Link className="w-4 h-4 mr-2" />
                代わりにリンクをコピー
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};