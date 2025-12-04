import React from 'react';
import { Job, MatchResult } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Building,
  Bookmark,
  ExternalLink,
  Brain,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CoverLetterGenerator } from '../CoverLetterGenerator';
import { ApplicationHelper } from '../ApplicationHelper';

interface JobCardProps {
  job: Job;
  matchResult?: MatchResult;
  onBookmark: (jobId: string) => void;
  onStatusChange: (jobId: string, status: Job['applicationStatus']) => void;
  onViewDetails: (job: Job) => void;
}

export function JobCard({
  job,
  matchResult,
  onBookmark,
  onStatusChange,
  onViewDetails,
}: JobCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500 border-green-500';
    if (score >= 40) return 'text-yellow-500 border-yellow-500';
    return 'text-red-500 border-red-500';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 70) return 'stroke-green-500';
    if (score >= 40) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  const score = matchResult?.score || 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow bg-card relative overflow-hidden group">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground line-clamp-2">
                {job.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Building className="w-4 h-4" />
                <span className="text-sm font-medium">{job.company}</span>
              </div>
            </div>
            
            {matchResult && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative flex items-center justify-center w-14 h-14 cursor-help">
                      <svg className="transform -rotate-90 w-full h-full">
                        <circle
                          cx="28"
                          cy="28"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          className="text-muted/20"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className={cn('transition-all duration-1000 ease-out', getScoreRingColor(score))}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className={cn('text-sm font-bold', getScoreColor(score).split(' ')[0])}>
                          {score}%
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="w-64 p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="font-semibold">Match Breakdown</span>
                        <span className={cn('font-bold', getScoreColor(score).split(' ')[0])}>
                          {score}%
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Skills Match:</span>
                          <span>{matchResult.details.skillScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Semantic Match:</span>
                          <span>{matchResult.details.semanticScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Keyword Match:</span>
                          <span>{matchResult.details.keywordScore}%</span>
                        </div>
                      </div>
                      {matchResult.matchedSkills.length > 0 && (
                        <div className="pt-2">
                          <span className="text-xs font-semibold text-green-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Matched Skills
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {matchResult.matchedSkills.slice(0, 3).map(skill => (
                              <Badge key={skill} variant="secondary" className="text-[10px] h-5 px-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                {skill}
                              </Badge>
                            ))}
                            {matchResult.matchedSkills.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{matchResult.matchedSkills.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      {matchResult.missingSkills.length > 0 && (
                        <div className="pt-1">
                          <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Missing Skills
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {matchResult.missingSkills.slice(0, 3).map(skill => (
                              <Badge key={skill} variant="secondary" className="text-[10px] h-5 px-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{job.location}</span>
            </div>
            {job.salary && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{job.salary}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="capitalize">
              {job.source}
            </Badge>
            <Badge 
              variant={job.applicationStatus === 'none' ? 'secondary' : 'default'}
              className={cn(
                job.applicationStatus === 'applied' && 'bg-green-500 hover:bg-green-600',
                job.applicationStatus === 'rejected' && 'bg-red-500 hover:bg-red-600',
                job.applicationStatus === 'interview' && 'bg-purple-500 hover:bg-purple-600',
                job.applicationStatus === 'offer' && 'bg-blue-500 hover:bg-blue-600'
              )}
            >
              {job.applicationStatus === 'none' ? 'Not Applied' : job.applicationStatus}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onBookmark(job._id)}
            className={cn(
              "hover:text-primary transition-colors",
              job.isBookmarked ? "text-primary fill-primary" : "text-muted-foreground"
            )}
          >
            <Bookmark className={cn("w-5 h-5", job.isBookmarked && "fill-current")} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange(job._id, 'applied')}>
                Mark as Applied
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(job._id, 'interview')}>
                Mark as Interview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(job._id, 'rejected')}>
                Mark as Rejected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(job._id, 'none')}>
                Reset Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Less Details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              More Details
            </>
          )}
        </Button>
        <div className="flex gap-2">
           <CoverLetterGenerator job={job} matchResult={matchResult} />
           <ApplicationHelper job={job} matchResult={matchResult} />
          
          <Button size="sm" asChild>
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              Apply Now <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 text-sm text-muted-foreground space-y-4 animate-in slide-in-from-top-2 duration-200">
          <p className="whitespace-pre-line">{job.description.slice(0, 500)}...</p>
        </div>
      )}
    </Card>
  );
}

