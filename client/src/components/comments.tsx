import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MessageSquare, Edit, Save, X, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CommentWithAuthor, SafeUser } from "@shared/schema";

interface CommentsProps {
  entityType: "project" | "goal" | "task";
  entityId: string;
  currentUser?: SafeUser;
}

export function Comments({ entityType, entityId, currentUser }: CommentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["/api/comments", entityType, entityId],
    queryFn: async () => {
      const response = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json() as Promise<CommentWithAuthor[]>;
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser) throw new Error("User not found");
      return await apiRequest("POST", "/api/comments", {
        content,
        authorId: currentUser.id,
        entityType,
        entityId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", entityType, entityId] });
      setNewComment("");
      setIsSubmitting(false);
      toast({
        title: "댓글 작성 완료",
        description: "댓글이 성공적으로 작성되었습니다.",
      });
    },
    onError: () => {
      setIsSubmitting(false);
      toast({
        title: "댓글 작성 실패",
        description: "댓글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return await apiRequest("PUT", `/api/comments/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", entityType, entityId] });
      setEditingComment(null);
      toast({
        title: "댓글 수정 완료",
        description: "댓글이 성공적으로 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "댓글 수정 실패",
        description: "댓글 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", entityType, entityId] });
      toast({
        title: "댓글 삭제 완료",
        description: "댓글이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "댓글 삭제 실패",
        description: "댓글 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    createCommentMutation.mutate(newComment);
  };

  const handleEditComment = (comment: CommentWithAuthor) => {
    setEditingComment({ id: comment.id, content: comment.content });
  };

  const handleSaveEdit = () => {
    if (!editingComment || !editingComment.content.trim()) return;
    updateCommentMutation.mutate(editingComment);
  };

  const handleDeleteComment = (id: string) => {
    deleteCommentMutation.mutate(id);
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일 ${hour}:${minute}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            댓글
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">댓글을 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          댓글 ({comments?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Comment Form */}
        {currentUser && (
          <div className="space-y-3">
            <Textarea
              placeholder="댓글을 작성하세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
              data-testid="textarea-new-comment"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmitComment} 
                disabled={!newComment.trim() || isSubmitting}
                data-testid="button-submit-comment"
              >
                {isSubmitting ? "작성 중..." : "댓글 작성"}
              </Button>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-4 space-y-3" data-testid={`comment-${comment.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {comment.author.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-comment-author-${comment.id}`}>
                        {comment.author.name}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-comment-date-${comment.id}`}>
                        {comment.createdAt && formatDate(comment.createdAt)}
                        {comment.updatedAt && comment.createdAt && comment.updatedAt !== comment.createdAt && " (수정됨)"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons for comment author */}
                  {currentUser && currentUser.id === comment.authorId && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditComment(comment)}
                        data-testid={`button-edit-comment-${comment.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-delete-comment-${comment.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteComment(comment.id)}
                              data-testid={`button-confirm-delete-comment-${comment.id}`}
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                {editingComment && editingComment.id === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingComment.content}
                      onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                      className="min-h-[60px]"
                      data-testid={`textarea-edit-comment-${comment.id}`}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingComment(null)}
                        data-testid={`button-cancel-edit-comment-${comment.id}`}
                      >
                        <X className="h-3 w-3 mr-1" />
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={!editingComment.content.trim()}
                        data-testid={`button-save-edit-comment-${comment.id}`}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap" data-testid={`text-comment-content-${comment.id}`}>
                    {comment.content}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-comments">
              아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}