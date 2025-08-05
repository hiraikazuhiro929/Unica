"use client";

import { CheckCircle, AlertCircle, Heart, MessageSquare } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyReviewSectionProps {
  todaysResults: string;
  whatWentWell: string;
  whatDidntGoWell: string;
  requestsToManagement: string;
  onReviewChange: (field: string, value: string) => void;
}

export default function DailyReviewSection({
  todaysResults,
  whatWentWell,
  whatDidntGoWell,
  requestsToManagement,
  onReviewChange,
}: DailyReviewSectionProps) {
  return (
    <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <CheckCircle className="w-5 h-5 text-green-600" />
          今日の振り返り
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 今日の結果 */}
        <div className="space-y-2">
          <Label htmlFor="todaysResults" className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-500" />
            今日の結果
          </Label>
          <Textarea
            id="todaysResults"
            value={todaysResults}
            onChange={(e) => onReviewChange("todaysResults", e.target.value)}
            placeholder="今日達成できたことや作業の結果について記入してください..."
            className="bg-white/50 border-gray-200 focus:border-blue-400 focus:bg-white min-h-[100px] resize-none"
          />
        </div>

        {/* うまくいったこと・感謝 */}
        <div className="space-y-2">
          <Label htmlFor="whatWentWell" className="text-sm font-medium flex items-center gap-2">
            <Heart className="w-4 h-4 text-green-500" />
            うまくいったこと・感謝
          </Label>
          <Textarea
            id="whatWentWell"
            value={whatWentWell}
            onChange={(e) => onReviewChange("whatWentWell", e.target.value)}
            placeholder="今日うまくいったことや感謝したいことについて記入してください..."
            className="bg-white/50 border-gray-200 focus:border-green-400 focus:bg-white min-h-[100px] resize-none"
          />
        </div>

        {/* うまくいかなかったこと・反省 */}
        <div className="space-y-2">
          <Label htmlFor="whatDidntGoWell" className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            うまくいかなかったこと・反省
          </Label>
          <Textarea
            id="whatDidntGoWell"
            value={whatDidntGoWell}
            onChange={(e) => onReviewChange("whatDidntGoWell", e.target.value)}
            placeholder="今日うまくいかなかったことや反省点について記入してください..."
            className="bg-white/50 border-gray-200 focus:border-orange-400 focus:bg-white min-h-[100px] resize-none"
          />
        </div>

        {/* 社内への要望 */}
        <div className="space-y-2">
          <Label htmlFor="requestsToManagement" className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-500" />
            社内への要望
          </Label>
          <Textarea
            id="requestsToManagement"
            value={requestsToManagement}
            onChange={(e) => onReviewChange("requestsToManagement", e.target.value)}
            placeholder="会社や管理部門への要望や提案があれば記入してください..."
            className="bg-white/50 border-gray-200 focus:border-purple-400 focus:bg-white min-h-[100px] resize-none"
          />
        </div>

        {/* 入力支援メッセージ */}
        <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">記入のヒント</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>今日の結果:</strong> 完了した作業、達成した目標、作業進捗など</li>
            <li>• <strong>うまくいったこと:</strong> 効率的だった作業方法、チームワーク、学んだことなど</li>
            <li>• <strong>うまくいかなかったこと:</strong> 困難だった作業、時間がかかった理由、改善点など</li>
            <li>• <strong>要望:</strong> 作業環境の改善、ツールの要請、研修の希望など</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}