import { useGameStore } from "@/engine/gameState";
import { Navigate } from "react-router-dom";
import {
  SKILL_LABELS,
  SKILL_DESCRIPTIONS,
  CAREER_TITLE_LABELS,
  getXPProgress,
  getXPForNextLevel,
  getNextCareerTitle,
} from "@/engine/skills";
import type { SkillId, SkillRecord } from "@/engine/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Target,
  Brain,
  TrendingUp,
  Users,
  Award,
  Star,
  Zap,
} from "lucide-react";

const CATEGORY_META = {
  hard: {
    label: "Hard Skills",
    icon: Target,
    description: "Technical and analytical VC competencies",
  },
  soft: {
    label: "Soft Skills",
    icon: Users,
    description: "Interpersonal and intuitive capabilities",
  },
} as const;

const LEVEL_COLORS = [
  "", // unused (0)
  "text-zinc-400", // 1
  "text-blue-400", // 2
  "text-emerald-400", // 3
  "text-amber-400", // 4
  "text-purple-400", // 5
] as const;

const LEVEL_LABELS = [
  "",
  "Novice",
  "Developing",
  "Proficient",
  "Advanced",
  "Expert",
];

function SkillCard({ skill }: { skill: SkillRecord }) {
  const progress = getXPProgress(skill.xp, skill.level) * 100;
  const nextXP = getXPForNextLevel(skill.level);
  const isMaxed = skill.level >= 5;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-card/80">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{SKILL_LABELS[skill.id]}</h3>
            <Badge
              variant="outline"
              className={`text-xs ${LEVEL_COLORS[skill.level]}`}
            >
              Lv.{skill.level}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {SKILL_DESCRIPTIONS[skill.id]}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger>
            <span className={`text-lg font-bold ${LEVEL_COLORS[skill.level]}`}>
              {LEVEL_LABELS[skill.level]}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {isMaxed ? "Max level reached!" : `${skill.xp} / ${nextXP} XP`}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{skill.xp} XP</span>
          <span>{isMaxed ? "MAX" : `${nextXP} XP`}</span>
        </div>
        <Progress value={isMaxed ? 100 : progress} className="h-2" />
      </div>
      {skill.contextTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skill.contextTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function CareerCard({
  profile,
}: {
  profile: {
    careerTitle: string;
    totalXP: number;
    skills: Record<SkillId, SkillRecord>;
  };
}) {
  const next = getNextCareerTitle(
    profile.careerTitle as import("@/engine/types").CareerTitle,
  );
  const skillValues = Object.values(profile.skills);
  const avgLevel =
    skillValues.reduce((sum, s) => sum + s.level, 0) / skillValues.length;
  const maxedSkills = skillValues.filter((s) => s.level >= 5).length;
  const totalSkills = skillValues.length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Award className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Career Title</p>
              <CardTitle className="text-xl">
                {
                  CAREER_TITLE_LABELS[
                    profile.careerTitle as keyof typeof CAREER_TITLE_LABELS
                  ]
                }
              </CardTitle>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {profile.totalXP.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Brain className="size-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {avgLevel.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Avg Level</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="size-4 text-amber-400" />
              <span className="text-lg font-semibold">{maxedSkills}</span>
            </div>
            <p className="text-xs text-muted-foreground">Mastered</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Zap className="size-4 text-emerald-400" />
              <span className="text-lg font-semibold">{totalSkills}</span>
            </div>
            <p className="text-xs text-muted-foreground">Skills</p>
          </div>
        </div>
        {next && (
          <div className="mt-4 rounded-md border border-border bg-background/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Next: {CAREER_TITLE_LABELS[next.title]}
              </span>
              <span className="font-medium">
                {next.xpNeeded - profile.totalXP} XP to go
              </span>
            </div>
            <Progress
              value={(profile.totalXP / next.xpNeeded) * 100}
              className="mt-2 h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Skills() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const playerProfile = useGameStore((s) => s.playerProfile);
  const showSkillHints = useGameStore((s) => s.showSkillHints);
  const setShowSkillHints = useGameStore((s) => s.setShowSkillHints);

  if (gamePhase === "setup") return <Navigate to="/" replace />;

  const skills = Object.values(playerProfile.skills);
  const hardSkills = skills
    .filter((s) => s.category === "hard")
    .sort((a, b) => b.xp - a.xp);
  const softSkills = skills
    .filter((s) => s.category === "soft")
    .sort((a, b) => b.xp - a.xp);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">VC Skills</h1>
      </div>

      <CareerCard profile={playerProfile} />

      <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3">
        <Label
          htmlFor="skill-hints"
          className="cursor-pointer text-sm text-muted-foreground"
        >
          Show skill XP toasts after actions
        </Label>
        <Switch
          id="skill-hints"
          checked={showSkillHints}
          onCheckedChange={setShowSkillHints}
        />
      </div>

      <Tabs defaultValue="hard">
        <TabsList>
          <TabsTrigger value="hard" className="gap-1.5">
            <Target className="size-3.5" />
            {CATEGORY_META.hard.label} ({hardSkills.length})
          </TabsTrigger>
          <TabsTrigger value="soft" className="gap-1.5">
            <Users className="size-3.5" />
            {CATEGORY_META.soft.label} ({softSkills.length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({skills.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="hard">
          <p className="mb-4 text-sm text-muted-foreground">
            {CATEGORY_META.hard.description}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {hardSkills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="soft">
          <p className="mb-4 text-sm text-muted-foreground">
            {CATEGORY_META.soft.description}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {softSkills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="grid gap-3 sm:grid-cols-2">
            {skills
              .sort((a, b) => b.xp - a.xp)
              .map((s) => (
                <SkillCard key={s.id} skill={s} />
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
