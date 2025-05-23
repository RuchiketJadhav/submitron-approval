import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Layout from "@/components/Layout";
import CommentSection from "@/components/CommentSection";
import { useProposals } from "@/contexts/ProposalContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Proposal, ProposalStatus, UserRole, ProposalType } from "@/utils/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle,
  Upload,
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Building,
  FileText,
  Users,
  CheckSquare,
  PlusCircle,
  Edit,
  RotateCcw,
  Search
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const ProposalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getProposalById, 
    approveProposal, 
    rejectProposal, 
    requestRevision,
    resubmitProposal, 
    approveAsApprover,
    rejectAsApprover,
    requestRevisionAsApprover,
    assignApprovers,
    assignToRegistrar,
    approveAsRegistrar,
    rejectAsRegistrar,
    requestRevisionAsRegistrar,
    getApprovalProgress,
    getPendingApprovers,
    canResubmit: checkCanResubmit,
    hasAllApproversResponded
  } = useProposals();
  const { currentUser, users } = useAuth();
  const [rejectionReason, setRejectionReason] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [approverSearchQuery, setApproverSearchQuery] = useState("");

  if (!id) {
    navigate("/");
    return null;
  }

  const proposal = getProposalById(id);
  
  if (!proposal) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-medium mb-2">Proposal not found</h2>
          <p className="text-muted-foreground mb-6">
            The proposal you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  if (!currentUser) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-medium mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            Please log in to view proposal details.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const isCreator = currentUser.id === proposal.createdBy;
  const isAssignee = currentUser.id === proposal.assignedTo;
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isRegistrar = currentUser.role === UserRole.REGISTRAR;
  const isPendingApprover = proposal.pendingApprovers?.includes(currentUser.id);
  
  // This flag determines who can see the approval steps
  const canSeeApprovalDetails = isAdmin || isRegistrar;
  
  const canApprove = 
    (isAssignee && proposal.status === ProposalStatus.PENDING_SUPERIOR) || 
    (isAdmin && proposal.status === ProposalStatus.PENDING_ADMIN);
  
  const canReject = 
    (isAssignee && proposal.status === ProposalStatus.PENDING_SUPERIOR) || 
    (isAdmin && proposal.status === ProposalStatus.PENDING_ADMIN);
    
  const canRequestRevision = 
    (isAssignee && proposal.status === ProposalStatus.PENDING_SUPERIOR) || 
    (isAdmin && proposal.status === ProposalStatus.PENDING_ADMIN);
  
  const canResubmit = checkCanResubmit(proposal, currentUser.id);
  
  const canAssignApprovers = isAdmin && 
    proposal.status === ProposalStatus.PENDING_APPROVERS && 
    (!proposal.approversAssigned || proposal.needsReassignment);
  
  const canApproveAsApprover = isPendingApprover && proposal.status === ProposalStatus.PENDING_APPROVERS;
  const canRejectAsApprover = isPendingApprover && proposal.status === ProposalStatus.PENDING_APPROVERS;
  const canRequestRevisionAsApprover = isPendingApprover && proposal.status === ProposalStatus.PENDING_APPROVERS;
  
  const canSendToRegistrar = isAdmin && 
                            proposal.status === ProposalStatus.PENDING_APPROVERS && 
                            proposal.approversAssigned && 
                            hasAllApproversResponded(proposal.id);
  
  const canApproveAsRegistrar = isRegistrar && proposal.status === ProposalStatus.PENDING_REGISTRAR;
  const canRejectAsRegistrar = isRegistrar && proposal.status === ProposalStatus.PENDING_REGISTRAR;
  const canRequestRevisionAsRegistrar = isRegistrar && proposal.status === ProposalStatus.PENDING_REGISTRAR;

  const canEdit = isCreator && 
                 (proposal.status === ProposalStatus.DRAFT || 
                  proposal.status === ProposalStatus.NEEDS_REVISION ||
                  proposal.status === ProposalStatus.PENDING_SUPERIOR);

  const approvalProgress = getApprovalProgress(proposal.id);

  const getStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.DRAFT:
        return (
          <Badge variant="outline" className="bg-muted/50">
            <Clock className="mr-1 h-3 w-3" />
            Draft
          </Badge>
        );
      case ProposalStatus.PENDING_SUPERIOR:
        return (
          <Badge variant="outline" className="badge-pending">
            <Clock className="mr-1 h-3 w-3" />
            Pending Superior
          </Badge>
        );
      case ProposalStatus.PENDING_ADMIN:
        return (
          <Badge variant="outline" className="badge-warning">
            <Clock className="mr-1 h-3 w-3" />
            Pending Admin
          </Badge>
        );
      case ProposalStatus.PENDING_APPROVERS:
        return (
          <Badge variant="outline" className="badge-info">
            <Users className="mr-1 h-3 w-3" />
            Pending Approvers
          </Badge>
        );
      case ProposalStatus.PENDING_REGISTRAR:
        return (
          <Badge variant="outline" className="badge-warning">
            <CheckSquare className="mr-1 h-3 w-3" />
            Pending Registrar
          </Badge>
        );
      case ProposalStatus.APPROVED:
        return (
          <Badge variant="outline" className="badge-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case ProposalStatus.REJECTED:
        return (
          <Badge variant="outline" className="badge-destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case ProposalStatus.NEEDS_REVISION:
        return (
          <Badge variant="outline" className="bg-amber-500 text-white">
            <RotateCcw className="mr-1 h-3 w-3" />
            Needs Revision
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderProposalTypeDetails = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {proposal.budget && (
          <div className="bg-muted/30 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Budget</h3>
            </div>
            <p>{proposal.budget}</p>
          </div>
        )}
        {proposal.timeline && (
          <div className="bg-muted/30 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Timeline</h3>
            </div>
            <p>{proposal.timeline}</p>
          </div>
        )}
        {proposal.justification && (
          <div className="bg-muted/30 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Justification</h3>
            </div>
            <p>{proposal.justification}</p>
          </div>
        )}
        {proposal.department && (
          <div className="bg-muted/30 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Department</h3>
            </div>
            <p>{proposal.department}</p>
          </div>
        )}
        {proposal.fieldValues && Object.keys(proposal.fieldValues).length > 0 && (
          Object.entries(proposal.fieldValues).map(([key, value]) => (
            <div key={key} className="bg-muted/30 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">{key}</h3>
              </div>
              <p>{value?.toString()}</p>
            </div>
          ))
        )}
      </div>
    );
  };

  const handleApprove = () => {
    approveProposal(proposal.id, approvalComment);
    setApprovalComment("");
  };

  const handleReject = () => {
    rejectProposal(proposal.id, rejectionReason);
    setRejectionReason("");
  };
  
  const handleRequestRevision = () => {
    requestRevision(proposal.id, revisionReason);
    setRevisionReason("");
  };

  const handleResubmit = () => {
    resubmitProposal(proposal.id);
  };
  
  const handleApproveAsApprover = () => {
    approveAsApprover(proposal.id, approvalComment);
    setApprovalComment("");
  };
  
  const handleRejectAsApprover = () => {
    rejectAsApprover(proposal.id, rejectionReason);
    setRejectionReason("");
  };
  
  const handleRequestRevisionAsApprover = () => {
    requestRevisionAsApprover(proposal.id, revisionReason);
    setRevisionReason("");
  };
  
  const handleAssignApprovers = () => {
    if (selectedApprovers.length === 0) {
      alert("Please select at least one approver");
      return;
    }
    assignApprovers(proposal.id, selectedApprovers);
    setSelectedApprovers([]);
  };
  
  const handleSendToRegistrar = () => {
    assignToRegistrar(proposal.id);
  };
  
  const handleApproveAsRegistrar = () => {
    approveAsRegistrar(proposal.id, approvalComment);
    setApprovalComment("");
  };
  
  const handleRejectAsRegistrar = () => {
    rejectAsRegistrar(proposal.id, rejectionReason);
    setRejectionReason("");
  };
  
  const handleRequestRevisionAsRegistrar = () => {
    requestRevisionAsRegistrar(proposal.id, revisionReason);
    setRevisionReason("");
  };
  
  const toggleApprover = (userId: string) => {
    if (selectedApprovers.includes(userId)) {
      setSelectedApprovers(selectedApprovers.filter(id => id !== userId));
    } else {
      setSelectedApprovers([...selectedApprovers, userId]);
    }
  };

  const renderApprovalSteps = () => {
    if (!proposal.approvalSteps || proposal.approvalSteps.length === 0) {
      return null;
    }
    
    // Only show approval steps to admins and registrars
    if (!canSeeApprovalDetails) {
      return null;
    }
    
    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Approval Process</h3>
        
        <div className="mb-4">
          <Progress value={approvalProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round(approvalProgress)}% complete
          </p>
        </div>
        
        <div className="space-y-3">
          {proposal.approvalSteps.map((step, index) => (
            <div key={index} className="border border-border rounded-md p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{step.userName}</p>
                  <p className="text-sm text-muted-foreground capitalize">{step.userRole.toLowerCase()}</p>
                </div>
                <div>
                  {step.status === "approved" ? (
                    <Badge variant="outline" className="badge-success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Approved
                    </Badge>
                  ) : step.status === "rejected" ? (
                    <Badge variant="outline" className="badge-destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      Rejected
                    </Badge>
                  ) : step.status === "resubmit" ? (
                    <Badge variant="outline" className="bg-amber-500 text-white">
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Requested Revision
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="badge-pending">
                      <Clock className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
              
              {step.timestamp && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(step.timestamp, "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
              
              {step.comment && (
                <p className="text-sm mt-2 bg-muted/20 p-2 rounded-md">
                  "{step.comment}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderApproverSelector = () => {
    if (!canAssignApprovers) return null;
    
    const potentialApprovers = users.filter(user => {
      if (approverSearchQuery) {
        return user.name.toLowerCase().includes(approverSearchQuery.toLowerCase());
      }
      return true;
    });
    
    if (potentialApprovers.length === 0 && !approverSearchQuery) {
      return (
        <div className="mt-4 p-4 bg-muted/20 rounded-md">
          <p className="text-sm text-muted-foreground">
            No users found.
          </p>
        </div>
      );
    }
    
    return (
      <div className="mt-4 border border-border p-4 rounded-md">
        <h3 className="font-medium mb-3">
          {proposal.needsReassignment 
            ? "Reassign Approvers (Required after revision)" 
            : "Assign Approvers"}
        </h3>
        
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search approvers..."
            value={approverSearchQuery}
            onChange={(e) => setApproverSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        {potentialApprovers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No users match your search criteria.
          </p>
        ) : (
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {potentialApprovers.map(user => (
              <div key={user.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={user.id}
                  checked={selectedApprovers.includes(user.id)}
                  onCheckedChange={() => toggleApprover(user.id)}
                />
                <label 
                  htmlFor={user.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {user.name}
                </label>
              </div>
            ))}
          </div>
        )}
        
        <Button onClick={handleAssignApprovers} className="mt-2">
          <PlusCircle className="mr-2 h-4 w-4" />
          {proposal.needsReassignment ? "Reassign Selected Approvers" : "Assign Selected Approvers"}
        </Button>
      </div>
    );
  };

  const handleEditProposal = () => {
    navigate(`/proposal/edit/${proposal.id}`);
  };

  return (
    <Layout>
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/")} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">Proposal Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">{proposal.title}</CardTitle>
                  {getStatusBadge(proposal.status)}
                </div>
                <CardDescription>
                  Created by {proposal.createdByName} on {format(proposal.createdAt, "MMMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                  <p className="whitespace-pre-line">{proposal.description}</p>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Proposal Type: <span className="capitalize">{proposal.type.toLowerCase().replace('_', ' ')}</span>
                  </h3>
                  {renderProposalTypeDetails()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/30 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Assigned To</h3>
                    <p>{proposal.assignedToName}</p>
                  </div>
                  
                  <div className="bg-muted/30 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Status</h3>
                    <p>{proposal.status.replace(/_/g, " ")}</p>
                  </div>
                </div>

                {renderApprovalSteps()}

                {(proposal.status === ProposalStatus.REJECTED || proposal.status === ProposalStatus.NEEDS_REVISION) && proposal.rejectionReason && (
                  <div className={`${proposal.status === ProposalStatus.REJECTED ? "bg-destructive/5 border-destructive/20" : "bg-amber-50 border-amber-200"} border p-4 rounded-md mb-6`}>
                    <div className="flex items-center gap-2 mb-2">
                      {proposal.status === ProposalStatus.REJECTED ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : (
                        <RotateCcw className="h-4 w-4 text-amber-500" />
                      )}
                      <h3 className="text-sm font-medium">
                        {proposal.status === ProposalStatus.REJECTED ? 
                          (proposal.rejectedByRegistrar ? "Rejected by Registrar (Final)" : "Rejection Reason") : 
                          "Revision Requested"}
                      </h3>
                    </div>
                    <p className={proposal.status === ProposalStatus.REJECTED ? "text-destructive/80" : "text-amber-700"}>
                      {proposal.rejectionReason}
                    </p>
                  </div>
                )}

                {renderApproverSelector()}
                
                {isAdmin && proposal.status === ProposalStatus.PENDING_APPROVERS && proposal.approversAssigned && !proposal.needsReassignment && (
                  <div className="mt-4 border border-border p-4 rounded-md">
                    <h3 className="font-medium mb-3">Assigned Approvers</h3>
                    <div className="space-y-2">
                      {proposal.approvers?.map(approverId => {
                        const approver = users.find(user => user.id === approverId);
                        return approver ? (
                          <div key={approver.id} className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-3 w-3" />
                            </div>
                            <span className="text-sm">{approver.name}</span>
                            
                            {proposal.approvalSteps?.some(step => 
                              step.userId === approver.id && 
                              (step.status === "approved" || step.status === "rejected" || step.status === "resubmit")
                            ) && (
                              <Badge variant="outline" className={
                                proposal.approvalSteps?.find(step => step.userId === approver.id)?.status === "approved" 
                                  ? "badge-success" 
                                  : proposal.approvalSteps?.find(step => step.userId === approver.id)?.status === "rejected"
                                    ? "badge-destructive"
                                    : "bg-amber-500 text-white"
                              }>
                                {proposal.approvalSteps?.find(step => step.userId === approver.id)?.status === "approved" 
                                  ? "Approved" 
                                  : proposal.approvalSteps?.find(step => step.userId === approver.id)?.status === "rejected"
                                    ? "Rejected"
                                    : "Requested Revision"
                                }
                              </Badge>
                            )}
                          </div>
                        ) : null;
                      })}
                    </div>

                    {proposal.needsReassignment && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          <AlertTriangle className="inline h-4 w-4 mr-1 text-amber-500" />
                          This proposal requires approver reassignment after revision.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 flex flex-wrap gap-3">
                {canEdit && (
                  <Button onClick={handleEditProposal} variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Proposal
                  </Button>
                )}
                
                {canResubmit && (
                  <Button onClick={handleResubmit}>
                    <Upload className="mr-2 h-4 w-4" />
                    Resubmit
                  </Button>
                )}
                
                {canApprove && (
                  <div className="w-full mb-3">
                    <Textarea
                      placeholder="Add a comment with your approval (optional)"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      className="mb-3"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={handleApprove}>
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="text-destructive">
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Proposal</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently reject the proposal. The proposer will not be able to resubmit.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-2">
                            <Textarea
                              placeholder="Reason for rejection"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="min-h-[100px]"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleReject} 
                              disabled={!rejectionReason.trim()}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Confirm Rejection
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
                
                {canApproveAsApprover && (
                  <div className="w-full mb-3">
                    <Textarea
                      placeholder="Add a comment with your approval (optional)"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      className="mb-3"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={handleApproveAsApprover}>
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Approve as Reviewer
                      </Button>
                    
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="text-destructive">
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            Reject as Reviewer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Proposal</AlertDialogTitle>
                            <AlertDialogDescription>
                              Your rejection will be recorded, but the proposal will still proceed to other approvers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-2">
                            <Textarea
                              placeholder="Reason for rejection"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="min-h-[100px]"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleRejectAsApprover} 
                              disabled={!rejectionReason.trim()}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Submit Rejection
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
                
                {canApproveAsRegistrar && (
                  <div className="w-full mb-3">
                    <Textarea
                      placeholder="Add a comment with your final approval (optional)"
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      className="mb-3"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={handleApproveAsRegistrar}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Final Approval
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="text-destructive">
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            Reject as Registrar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Proposal</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently reject the proposal. The proposer will not be able to resubmit.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-2">
                            <Textarea
                              placeholder="Reason for rejection"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="min-h-[100px]"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleRejectAsRegistrar} 
                              disabled={!rejectionReason.trim()}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Confirm Rejection
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
                
                {canSendToRegistrar && (
                  <Button onClick={handleSendToRegistrar} className="ml-auto">
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Send to Registrar
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card>
            <CardContent className="pt-6">
              <CommentSection proposalId={proposal.id} comments={proposal.comments} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default ProposalDetails;
