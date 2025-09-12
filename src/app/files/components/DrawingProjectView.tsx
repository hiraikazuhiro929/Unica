"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, ChevronDown, FileText, Eye, Download, 
  Edit, Calendar, User, Building2, GitBranch
} from "lucide-react";

interface DrawingItem {
  id: string;
  drawingNumber: string;
  title: string;
  revision: string;
  drawingType: "assembly" | "part" | "section" | "detail";
  projectName: string;
  clientName: string;
  designedBy: string;
  approvedBy: string;
  drawingDate: string;
  approvalDate: string;
  scale: string;
  status: "draft" | "approved" | "revision" | "obsolete";
  filePath: string;
  fileSize: number;
  thumbnailUrl?: string;
}

interface DrawingProjectViewProps {
  drawings: DrawingItem[];
  onView: (drawing: DrawingItem) => void;
  onDownload: (drawing: DrawingItem) => void;
  onEdit: (drawing: DrawingItem) => void;
}

interface ProjectGroup {
  projectName: string;
  clientName: string;
  drawings: DrawingItem[];
  latestDate: string;
}

export const DrawingProjectView: React.FC<DrawingProjectViewProps> = ({
  drawings,
  onView,
  onDownload,
  onEdit
}) => {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "grid">("tree");

  const toggleProject = (projectName: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectName)) {
      newExpanded.delete(projectName);
    } else {
      newExpanded.add(projectName);
    }
    setExpandedProjects(newExpanded);
  };

  const groupedDrawings = drawings.reduce((acc, drawing) => {
    if (!acc[drawing.projectName]) {
      acc[drawing.projectName] = {
        projectName: drawing.projectName,
        clientName: drawing.clientName,
        drawings: [],
        latestDate: drawing.drawingDate
      };
    }
    acc[drawing.projectName].drawings.push(drawing);
    if (drawing.drawingDate > acc[drawing.projectName].latestDate) {
      acc[drawing.projectName].latestDate = drawing.drawingDate;
    }
    return acc;
  }, {} as Record<string, ProjectGroup>);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "assembly": return "組立図";
      case "part": return "部品図";
      case "section": return "断面図";
      case "detail": return "詳細図";
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "draft": return "bg-yellow-100 text-yellow-700";
      case "revision": return "bg-orange-100 text-orange-700";
      case "obsolete": return "bg-gray-100 text-gray-700";
      default: return "";
    }
  };

  const renderTreeView = () => (
    <div className="space-y-4">
      {Object.values(groupedDrawings).map((project) => {
        const isExpanded = expandedProjects.has(project.projectName);
        return (
          <Card key={project.projectName} className="overflow-hidden">
            <div
              className="p-4 bg-gray-50 dark:bg-slate-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={() => toggleProject(project.projectName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{project.projectName}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-slate-400 mt-1">
                      <span className="flex items-center">
                        <Building2 className="w-3 h-3 mr-1" />
                        {project.clientName}
                      </span>
                      <span className="flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        {project.drawings.length}件
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {project.latestDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t">
                <div className="divide-y divide-gray-200 dark:divide-slate-600">
                  {project.drawings.map((drawing) => (
                    <div key={drawing.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-medium">{drawing.drawingNumber}</span>
                              <Badge variant="outline" className="text-xs">
                                {drawing.revision}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getTypeLabel(drawing.drawingType)}
                              </Badge>
                              <Badge className={`text-xs ${getStatusColor(drawing.status)}`}>
                                {drawing.status === "approved" ? "承認済" :
                                 drawing.status === "draft" ? "下書き" :
                                 drawing.status === "revision" ? "改訂中" : "廃版"}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                              {drawing.title}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                              <span>縮尺: {drawing.scale}</span>
                              <span className="flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                {drawing.designedBy}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {drawing.drawingDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onView(drawing)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDownload(drawing)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(drawing)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {drawings.map((drawing) => (
        <Card 
          key={drawing.id} 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onView(drawing)}
        >
          <div className="aspect-[4/3] bg-gray-100 dark:bg-slate-700 relative p-4">
            {drawing.thumbnailUrl ? (
              <img 
                src={drawing.thumbnailUrl} 
                alt={drawing.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="w-16 h-16 text-gray-400" />
              </div>
            )}
            <div className="absolute top-2 right-2">
              <Badge className={`text-xs ${getStatusColor(drawing.status)}`}>
                {drawing.status === "approved" ? "承認済" :
                 drawing.status === "draft" ? "下書き" :
                 drawing.status === "revision" ? "改訂中" : "廃版"}
              </Badge>
            </div>
          </div>

          <div className="p-3">
            <div className="font-medium text-sm">{drawing.drawingNumber}</div>
            <div className="text-xs text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">
              {drawing.title}
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline" className="text-xs">
                {drawing.revision}
              </Badge>
              <span className="text-xs text-gray-500">{drawing.scale}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {drawing.projectName}
            </div>
          </div>

          <div className="px-3 pb-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onDownload(drawing)}
            >
              <Download className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(drawing)}
            >
              <Edit className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "tree" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("tree")}
          >
            <GitBranch className="w-4 h-4 mr-1" />
            プロジェクト表示
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            グリッド表示
          </Button>
        </div>
      </div>

      {viewMode === "tree" ? renderTreeView() : renderGridView()}
    </div>
  );
};