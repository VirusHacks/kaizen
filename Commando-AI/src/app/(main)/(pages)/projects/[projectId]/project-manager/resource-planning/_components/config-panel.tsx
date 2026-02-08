'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Settings2,
  Save,
  Loader2,
  Scale,
  Clock,
  Flame,
  SlidersHorizontal,
  Brain,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateResourceConfig } from '../_actions/resource-actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type ConfigData = {
  deliverySlippageWeight: number
  costOverrunWeight: number
  overworkWeight: number
  onTimeBonusWeight: number
  maxChangesPerCycle: number
  learningEnabled: boolean
  burnoutThreshold: number
  overworkHoursWeekly: number
  idleThresholdPercent: number
}

type Props = {
  config: ConfigData
  projectId: string
}

const ConfigPanel = ({ config, projectId }: Props) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [values, setValues] = useState<ConfigData>({ ...config })
  const [dirty, setDirty] = useState(false)

  const weightSum =
    values.deliverySlippageWeight +
    values.costOverrunWeight +
    values.overworkWeight +
    values.onTimeBonusWeight

  const weightsValid = Math.abs(weightSum - 1.0) < 0.05

  const update = (key: keyof ConfigData, val: number | boolean) => {
    setValues(prev => ({ ...prev, [key]: val }))
    setDirty(true)
  }

  const handleSave = () => {
    if (!weightsValid) {
      toast.error('Reward weights must sum to approximately 1.0')
      return
    }
    startTransition(async () => {
      const result = await updateResourceConfig(projectId, values)
      if (result.success) {
        toast.success('Configuration saved')
        setDirty(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-slate-500/20 to-zinc-600/20 flex items-center justify-center ring-1 ring-slate-500/20">
            <Settings2 className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Engine Configuration</h3>
            <p className="text-xs text-muted-foreground">Fine-tune the AI planning engine</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || isPending || !weightsValid}
          className={cn(
            'gap-1.5 text-xs h-8 transition-all',
            dirty
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Reward Weights */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-semibold">Reward Weights</span>
            </div>
            <Badge
              className={cn(
                'text-[10px] border-0',
                weightsValid
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-red-500/10 text-red-600'
              )}
            >
              Sum: {weightSum.toFixed(2)}
            </Badge>
          </div>
          {!weightsValid && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Weights must sum to approximately 1.0
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <WeightInput
              label="Delivery Slippage"
              value={values.deliverySlippageWeight}
              onChange={(v) => update('deliverySlippageWeight', v)}
              color="text-red-500"
            />
            <WeightInput
              label="Cost Overrun"
              value={values.costOverrunWeight}
              onChange={(v) => update('costOverrunWeight', v)}
              color="text-amber-500"
            />
            <WeightInput
              label="Overwork Penalty"
              value={values.overworkWeight}
              onChange={(v) => update('overworkWeight', v)}
              color="text-orange-500"
            />
            <WeightInput
              label="On-Time Bonus"
              value={values.onTimeBonusWeight}
              onChange={(v) => update('onTimeBonusWeight', v)}
              color="text-emerald-500"
            />
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div className="bg-red-500 transition-all" style={{ width: `${(values.deliverySlippageWeight / weightSum) * 100}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${(values.costOverrunWeight / weightSum) * 100}%` }} />
            <div className="bg-orange-500 transition-all" style={{ width: `${(values.overworkWeight / weightSum) * 100}%` }} />
            <div className="bg-emerald-500 transition-all" style={{ width: `${(values.onTimeBonusWeight / weightSum) * 100}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Planning Cycle */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold">Planning Cycle</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Max Recommendations / Cycle</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={values.maxChangesPerCycle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('maxChangesPerCycle', parseInt(e.target.value) || 5)}
                className="h-9"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-violet-500" />
                  <Label className="text-xs font-medium">RL Learning</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">Thompson Sampling</p>
              </div>
              <Switch
                checked={values.learningEnabled}
                onCheckedChange={(checked: boolean) => update('learningEnabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold">Alert Thresholds</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Burnout Threshold</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={values.burnoutThreshold}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('burnoutThreshold', parseInt(e.target.value) || 70)}
                  className="h-9 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Overwork Hours/Week</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={20}
                  max={80}
                  value={values.overworkHoursWeekly}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('overworkHoursWeekly', parseInt(e.target.value) || 50)}
                  className="h-9 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Idle Threshold</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={values.idleThresholdPercent}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('idleThresholdPercent', parseInt(e.target.value) || 30)}
                  className="h-9 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function WeightInput({
  label,
  value,
  onChange,
  color,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  color: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn('text-xs', color)}>{label}</Label>
      <Input
        type="number"
        step={0.05}
        min={0}
        max={1}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value) || 0)}
        className="h-9 tabular-nums"
      />
    </div>
  )
}

export default ConfigPanel
