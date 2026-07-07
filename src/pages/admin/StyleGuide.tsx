import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sun,
  Moon,
  Monitor,
  Check,
  AlertTriangle,
  Info,
  XCircle,
  Search,
  Plus,
  Trash2,
  Download,
  Settings,
  Bell,
  Eye,
  Type,
  Square,
  Table,
  Layout,
  Palette,
  Layers,
  ChevronRight,
  Users,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table as TableComponent, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useTheme } from '@/themes';
import AdminPageTemplate from '@/components/AdminPageTemplate';
import { toast } from 'sonner';

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const Swatch: React.FC<{ bgClass: string; label: string; textClass?: string }> = ({ bgClass, label, textClass = 'text-foreground' }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className={`w-16 h-16 rounded-lg border border-border ${bgClass} ${textClass} flex items-center justify-center shadow-sm`}>
      <span className="text-sm font-semibold">Aa</span>
    </div>
    <span className="text-xs text-muted-foreground text-center font-medium">{label}</span>
  </div>
);

const SpecBox: React.FC<{ label: string; value: string; children: React.ReactNode }> = ({ label, value, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">{value}</code>
    </div>
    <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30">
      {children}
    </div>
  </div>
);

const DoDont: React.FC<{ do: React.ReactNode; dont: React.ReactNode }> = ({ do: doItem, dont: dontItem }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
    <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
      <div className="flex items-center gap-2 mb-2">
        <Check className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">DO</span>
      </div>
      <div className="text-sm">{doItem}</div>
    </div>
    <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
      <div className="flex items-center gap-2 mb-2">
        <XCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm font-semibold text-destructive">DON&apos;T</span>
      </div>
      <div className="text-sm">{dontItem}</div>
    </div>
  </div>
);

export default function StyleGuidePage() {
  const { t } = useTranslation();
  const { colorMode, setColorMode } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [switchValue, setSwitchValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <TooltipProvider>
      <AdminPageTemplate
        title={t('styleGuide.title', '组件规范指南')}
        titleIcon={<Palette className="h-8 w-8" />}
        themeColor="indigo"
        description={t('styleGuide.description', '交互式组件规范与视觉验证')}
        actions={
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t('styleGuide.language', 'Language')}</p>
                <p className="text-sm font-medium">{t('styleGuide.i18nEnabled', 'i18n Enabled')}</p>
              </div>
              <div className="flex items-center rounded-md border border-border p-1 gap-0.5">
              <Button
                variant={colorMode === 'light' ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={() => setColorMode('light')}
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                variant={colorMode === 'dark' ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={() => setColorMode('dark')}
              >
                <Moon className="h-4 w-4" />
              </Button>
              <Button
                variant={colorMode === 'system' ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={() => setColorMode('system')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {t('styleGuide.quickSpec', '规范速查')}
            </CardTitle>
            <CardDescription>{t('styleGuide.quickSpecDesc', '所有页面必须遵守的8条核心规范')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-primary overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Square className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-foreground">{t('styleGuide.formHeight', '表单高度')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('styleGuide.formHeightDesc', '所有 Input/Select/Button 默认使用 h-9 (36px)。紧凑场景（如表格操作）可使用 size="sm" (h-8)。')}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-emerald-500 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Palette className="h-5 w-5 text-emerald-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">{t('styleGuide.semanticColors', '语义化颜色')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('styleGuide.semanticColorsRule', '使用 bg-background、text-foreground、bg-muted、border-border 等语义化 token。禁止硬编码 text-slate-*、bg-slate-* 等颜色，会破坏深色模式。')}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Type className="h-5 w-5 text-amber-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">{t('styleGuide.typographyRule', '字体层级')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('styleGuide.typographyRuleDesc', '使用 Tailwind 字体类：页面标题 text-3xl font-bold、卡片标题 text-lg font-semibold、正文 text-sm、辅助文字 text-xs。禁止内联设置 font-size。')}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-sky-500 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Info className="h-5 w-5 text-sky-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">{t('styleGuide.i18nRule', 'i18n 要求')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('styleGuide.i18nRuleDesc', '所有用户可见文字必须使用 t(\'key\', \'fallback\') 并提供英文后备文本。禁止在 JSX 中直接硬编码中/英/日文字符串。')}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-destructive overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <h4 className="font-semibold text-foreground">{t('styleGuide.forbidden', '禁止项')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('styleGuide.forbiddenDesc', '禁止使用 .c-xxx 遗留类名。禁止 window.alert/confirm。禁止内联样式设置颜色/尺寸。禁止引入 Vite/vitest 相关依赖。')}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-violet-500 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Layout className="h-5 w-5 text-violet-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">{t('styleGuide.pageHeader', '页面头部规范')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('styleGuide.pageHeaderDesc', '必须使用 AdminPageTemplate：面包屑 → ICON(h-8 w-8)+标题+Badge(同行) + 描述 → 标题栏右侧仅放辅助操作。主操作按钮（新建/创建）通过 primaryAction 沉底在内容区底部（border-t 分隔）。')}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Palette className="h-5 w-5 text-amber-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">{t('styleGuide.pageThemeColor', '页面主题色')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('styleGuide.pageThemeColorDesc', '每个页面分配专属主题色（如 rose=通知、violet=频道、emerald=标签），通过 themeColor 属性统一管理标题ICON和卡片颜色。')}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-sky-500 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-sky-500" />
                    </div>
                    <h4 className="font-semibold text-foreground">{t('styleGuide.statCardIcons', '统计卡片ICON')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('styleGuide.statCardIconsDesc', '统计卡片ICON使用页面主题色的不同色阶（600/500/400/300），保持统一又有视觉层次。禁止同一页面使用多种不同颜色。')}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 h-auto flex-wrap">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              {t('styleGuide.overview', '概览')}
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-1.5">
              <Type className="h-4 w-4" />
              {t('styleGuide.typography', '字体排版')}
            </TabsTrigger>
            <TabsTrigger value="buttons" className="flex items-center gap-1.5">
              <Square className="h-4 w-4" />
              {t('styleGuide.buttons', '按钮')}
            </TabsTrigger>
            <TabsTrigger value="forms" className="flex items-center gap-1.5">
              <Edit3 className="h-4 w-4" />
              {t('styleGuide.forms', '表单')}
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1.5">
              <Table className="h-4 w-4" />
              {t('styleGuide.dataDisplay', '数据展示')}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              {t('styleGuide.feedback', '反馈')}
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-1.5">
              <Palette className="h-4 w-4" />
              {t('styleGuide.colors', '颜色')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Section title={t('styleGuide.componentHeight', '组件高度标准')} description={t('styleGuide.componentHeightDesc', '视觉对比 — 所有标准表单控件对齐 36px 基线')}>
              <div className="space-y-6">
                <div className="flex flex-wrap items-end gap-4 p-6 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <Input placeholder={t('styleGuide.defaultInput', 'Default Input')} className="w-48" />
                    <p className="text-xs text-muted-foreground mt-2">{t('styleGuide.inputH9', 'Input (h-9)')}</p>
                  </div>
                  <div className="text-center">
                    <Select value={selectValue} onValueChange={setSelectValue}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder={t('styleGuide.defaultSelect', 'Default Select')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t('styleGuide.option1', 'Option 1')}</SelectItem>
                        <SelectItem value="2">{t('styleGuide.option2', 'Option 2')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">{t('styleGuide.selectH9', 'Select (h-9)')}</p>
                  </div>
                  <div className="text-center">
                    <Button>{t('styleGuide.defaultButton', 'Default Button')}</Button>
                    <p className="text-xs text-muted-foreground mt-2">{t('styleGuide.buttonH9', 'Button (h-9)')}</p>
                  </div>
                  <div className="text-center">
                    <Button variant="outline">{t('styleGuide.outlineButton', 'Outline Button')}</Button>
                    <p className="text-xs text-muted-foreground mt-2">{t('styleGuide.outlineH9', 'Outline (h-9)')}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-sm font-medium text-foreground mb-3">{t('styleGuide.sizeVariants', '尺寸变体（谨慎使用）')}</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <Button size="sm">{t('styleGuide.small', 'Small (h-8)')}</Button>
                    <Button>{t('styleGuide.defaultSize', 'Default (h-9)')}</Button>
                    <Button size="lg">{t('styleGuide.large', 'Large (h-10)')}</Button>
                    <Button size="icon-sm" variant="outline"><Edit3 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline"><Search className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="typography">
            <Section title={t('styleGuide.typeScale', '字体层级')} description={t('styleGuide.typeScaleDesc', '标准化字体排版层级 — 切换语言不会改变字号')}>
              <div className="space-y-6">
                <SpecBox label={t('styleGuide.pageTitle', '页面标题')} value="text-3xl font-bold">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('styleGuide.pageTitleSample', '媒体管理')}</h1>
                </SpecBox>
                <SpecBox label={t('styleGuide.cardTitle', '卡片/对话框标题')} value="text-lg font-semibold">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">{t('styleGuide.cardTitleSample', '用户信息')}</h3>
                </SpecBox>
                <SpecBox label={t('styleGuide.sectionHeader', '区块标题')} value="text-base font-semibold">
                  <h4 className="text-base font-semibold text-foreground">{t('styleGuide.sectionHeaderSample', '筛选选项')}</h4>
                </SpecBox>
                <SpecBox label={t('styleGuide.bodyText', '正文')} value="text-sm font-normal">
                  <p className="text-sm font-normal text-foreground">{t('styleGuide.bodyTextSample', '这是标准正文文本，用于表格、描述和表单标签。')}</p>
                </SpecBox>
                <SpecBox label={t('styleGuide.auxText', '辅助文字')} value="text-xs text-muted-foreground">
                  <p className="text-xs text-muted-foreground">{t('styleGuide.auxTextSample', '时间戳、ID、帮助文本 — 使用 text-xs 搭配 muted-foreground')}</p>
                </SpecBox>
                <DoDont
                  do={
                    <div>
                      <p className="text-lg font-semibold text-foreground mb-1">{t('styleGuide.correctTitle', '正确的卡片标题')}</p>
                      <p className="text-sm text-muted-foreground">{t('styleGuide.correctDesc', '使用 CardTitle 组件，内置 text-lg font-semibold。字号在各语言间保持一致。')}</p>
                    </div>
                  }
                  dont={
                    <div>
                      <p className="text-xl font-bold" style={{ color: '#1e293b' }}>{t('styleGuide.wrongTitle', '错误的卡片标题')}</p>
                      <p className="text-sm" style={{ color: '#64748b' }}>{t('styleGuide.wrongDesc', '硬编码 text-xl/text-xl + slate 颜色会破坏深色模式和 i18n 字体渲染。')}</p>
                    </div>
                  }
                />
                <SpecBox label={t('styleGuide.pageLayout', '完整页面布局（标题+ICON+描述+主按钮沉底）')} value="AdminPageTemplate">
                  <div className="rounded-lg border border-border overflow-hidden bg-background">
                    <div className="p-8">
                      <Breadcrumb className="mb-4">
                        <BreadcrumbList>
                          <BreadcrumbItem>
                            <BreadcrumbLink href="#" onClick={e => e.preventDefault()}>{t('admin.breadcrumb.dashboard', '仪表盘')}</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbPage>{t('styleGuide.notificationSample', '通知管理')}</BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>
                      <div className="flex items-center justify-between mb-6">
                        <div className="space-y-1">
                          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <span className="h-8 w-8 shrink-0 flex items-center justify-center text-rose-600">
                              <Bell className="h-8 w-8" />
                            </span>
                            {t('styleGuide.notificationSample', '通知管理')}
                            <span className="shrink-0"><Badge variant="secondary">{t('styleGuide.realTime', '实时')}</Badge></span>
                          </h1>
                          <p className="text-sm text-muted-foreground">{t('styleGuide.notificationSampleDesc', '配置、发送和审计系统级通知')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />{t('styleGuide.export', '导出')}</Button>
                          <Button variant="outline" size="icon-sm"><Settings className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="rounded border border-dashed border-border bg-muted/20 p-8 text-center">
                          <p className="text-sm text-muted-foreground">{t('styleGuide.contentArea', '（表格/统计/列表等内容区域）')}</p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-6 border-t border-border mt-6">
                        <Button>
                          <Plus className="h-4 w-4" />
                          {t('styleGuide.compose', '编写通知')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </SpecBox>
                <DoDont
                  do={
                    <div>
                      <div className="rounded border border-border/60 overflow-hidden mb-2">
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <span className="h-6 w-6 shrink-0 flex items-center justify-center text-rose-600">
                                  <Bell className="h-6 w-6" />
                                </span>
                                {t('styleGuide.notificationSample', '通知管理')}
                                <Badge variant="secondary" className="shrink-0">{t('styleGuide.realTime', '实时')}</Badge>
                              </h1>
                              <p className="text-xs text-muted-foreground">{t('styleGuide.notificationSampleDesc', '配置、发送和审计系统级通知')}</p>
                            </div>
                            <Button variant="outline" size="sm"><Download className="h-3 w-3 mr-1" />{t('styleGuide.export', '导出')}</Button>
                          </div>
                          <div className="flex justify-end pt-2 border-t border-border/50 mt-2">
                            <Button size="sm"><Plus className="h-3 w-3" />{t('styleGuide.compose', '编写通知')}</Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('styleGuide.correctTitleDesc', 'ICON h-8 w-8 与标题同行，Badge 同行显示，使用 space-y-1 控制标题与描述间距，描述使用 text-sm text-muted-foreground，标题栏仅放辅助操作（导出/设置），主操作按钮通过 primaryAction 沉底在内容区底部（border-t 分隔）。')}</p>
                    </div>
                  }
                  dont={
                    <div>
                      <div className="rounded border border-border/60 overflow-hidden mb-2">
                        <div className="p-3">
                          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Bell className="h-4 w-4 text-rose-600" />
                            {t('styleGuide.notificationSample', '通知管理')}
                            <Button size="sm"><Plus className="h-3 w-3" />{t('styleGuide.compose', '编写通知')}</Button>
                          </h1>
                          <div className="mt-1"><Badge variant="secondary">{t('styleGuide.realTime', '实时')}</Badge></div>
                          <p className="text-xs mt-1" style={{color:'#64748b'}}>{t('styleGuide.notificationSampleDesc', '配置、发送和审计系统级通知')}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('styleGuide.wrongTitleDesc', 'ICON h-6 w-6 太小、Badge 换行、描述使用硬编码 slate 颜色、主按钮（新建）错误地放在标题栏中。')}</p>
                    </div>
                  }
                />
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="buttons">
            <Section title={t('styleGuide.buttonVariants', '按钮变体')}>
              <div className="flex flex-wrap gap-3">
                <Button>{t('styleGuide.primary', '主要按钮')}</Button>
                <Button variant="secondary">{t('styleGuide.secondary', '次要按钮')}</Button>
                <Button variant="destructive">{t('styleGuide.destructive', '危险按钮')}</Button>
                <Button variant="outline">{t('styleGuide.outline', '描边按钮')}</Button>
                <Button variant="ghost">{t('styleGuide.ghost', '幽灵按钮')}</Button>
                <Button variant="link">{t('styleGuide.link', '链接按钮')}</Button>
              </div>
            </Section>
            <Section title={t('styleGuide.buttonWithIcons', '带图标按钮')}>
              <div className="flex flex-wrap gap-3">
                <Button><Plus className="h-4 w-4" />{t('styleGuide.addNew', '新增')}</Button>
                <Button variant="outline"><Download className="h-4 w-4" />{t('styleGuide.export', '导出')}</Button>
                <Button variant="destructive"><Trash2 className="h-4 w-4" />{t('styleGuide.delete', '删除')}</Button>
                <Button size="icon" variant="outline"><Search className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </Section>
            <Section title={t('styleGuide.buttonStates', '按钮状态')}>
              <div className="flex flex-wrap gap-3">
                <Button>{t('styleGuide.normal', '正常')}</Button>
                <Button disabled>{t('styleGuide.disabled', '禁用')}</Button>
                <Button variant="outline">{t('styleGuide.normal', '正常')}</Button>
                <Button variant="outline" disabled>{t('styleGuide.disabled', '禁用')}</Button>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="forms">
            <Section title={t('styleGuide.inputFields', '输入框')} description={t('styleGuide.inputFieldsDesc', '所有输入框高度 h-9，圆角 rounded-md 边框，使用语义化 token')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                <div className="space-y-2">
                  <Label htmlFor="demo-input">{t('styleGuide.defaultInputLabel', '默认输入框')}</Label>
                  <Input id="demo-input" placeholder={t('styleGuide.enterText', '请输入文字...')} value={inputValue} onChange={e => setInputValue(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('styleGuide.helperText', '帮助文字放在这里')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-search">{t('styleGuide.searchWithIcon', '带图标搜索框')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="demo-search" placeholder={t('styleGuide.search', '搜索...')} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-disabled">{t('styleGuide.disabledInput', '禁用输入框')}</Label>
                  <Input id="demo-disabled" placeholder={t('styleGuide.disabled', '已禁用')} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-textarea">{t('styleGuide.textareaLabel', '多行文本框')}</Label>
                  <Textarea id="demo-textarea" placeholder={t('styleGuide.multiLineText', '多行文本...')} value={textareaValue} onChange={e => setTextareaValue(e.target.value)} className="min-h-[100px]" />
                </div>
              </div>
            </Section>
            <Section title={t('styleGuide.selectAndChoices', '选择器与选项')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                <div className="space-y-2">
                  <Label>{t('styleGuide.selectLabel', '下拉选择')}</Label>
                  <Select value={selectValue} onValueChange={setSelectValue}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('styleGuide.selectOption', '请选择一个选项')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">{t('styleGuide.optionOne', '选项一')}</SelectItem>
                      <SelectItem value="option2">{t('styleGuide.optionTwo', '选项二')}</SelectItem>
                      <SelectItem value="option3">{t('styleGuide.optionThree', '选项三')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('styleGuide.checkboxLabel', '复选框')}</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="demo-check" checked={checkboxValue} onCheckedChange={(v) => setCheckboxValue(!!v)} />
                      <label htmlFor="demo-check" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {t('styleGuide.agreeTerms', '我同意条款')}
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('styleGuide.switchLabel', '开关')}</Label>
                    <div className="flex items-center space-x-2">
                      <Switch id="demo-switch" checked={switchValue} onCheckedChange={setSwitchValue} />
                      <label htmlFor="demo-switch" className="text-sm font-medium leading-none cursor-pointer">
                        {t('styleGuide.enableFeature', '启用功能')}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </Section>
            <Section title={t('styleGuide.formDemo', '完整表单示例')}>
              <div className="max-w-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('styleGuide.firstName', '名')}</Label>
                    <Input placeholder={t('styleGuide.firstName', '名')} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('styleGuide.lastName', '姓')}</Label>
                    <Input placeholder={t('styleGuide.lastName', '姓')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('styleGuide.email', '邮箱')}</Label>
                  <Input type="email" placeholder="x***@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>{t('styleGuide.role', '角色')}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t('styleGuide.selectRole', '请选择角色')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('styleGuide.admin', '管理员')}</SelectItem>
                      <SelectItem value="editor">{t('styleGuide.editor', '编辑')}</SelectItem>
                      <SelectItem value="user">{t('styleGuide.user', '普通用户')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline">{t('styleGuide.cancel', '取消')}</Button>
                  <Button onClick={() => toast.success(t('styleGuide.savedSuccessfully', '保存成功！'))}>{t('styleGuide.save', '保存')}</Button>
                </div>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="data">
            <Section title={t('styleGuide.badges', '徽章')}>
              <div className="flex flex-wrap gap-2">
                <Badge>{t('styleGuide.defaultBadge', '默认')}</Badge>
                <Badge variant="secondary">{t('styleGuide.secondaryBadge', '次要')}</Badge>
                <Badge variant="outline">{t('styleGuide.outlineBadge', '描边')}</Badge>
                <Badge variant="destructive">{t('styleGuide.destructiveBadge', '危险')}</Badge>
                <Badge variant="success">{t('styleGuide.successBadge', '成功')}</Badge>
                <Badge variant="warning">{t('styleGuide.warningBadge', '警告')}</Badge>
                <Badge variant="info">{t('styleGuide.infoBadge', '信息')}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="soft-success">{t('styleGuide.published', '已发布')}</Badge>
                <Badge variant="soft-warning">{t('styleGuide.processing', '处理中')}</Badge>
                <Badge variant="soft-danger">{t('styleGuide.failed', '失败')}</Badge>
                <Badge variant="soft-info">{t('styleGuide.queued', '排队中')}</Badge>
                <Badge variant="soft-neutral">{t('styleGuide.draft', '草稿')}</Badge>
              </div>
            </Section>
            <Section title={t('styleGuide.table', '表格')}>
              <div className="border border-border rounded-lg overflow-hidden">
                <TableComponent>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="font-semibold">{t('styleGuide.name', '姓名')}</TableHead>
                      <TableHead className="font-semibold">{t('styleGuide.status', '状态')}</TableHead>
                      <TableHead className="font-semibold">{t('styleGuide.role', '角色')}</TableHead>
                      <TableHead className="text-right font-semibold">{t('styleGuide.actions', '操作')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: t('styleGuide.zhangSan', '张三'), status: 'active', role: t('styleGuide.admin', '管理员') },
                      { name: t('styleGuide.liSi', '李四'), status: 'processing', role: t('styleGuide.editor', '编辑') },
                      { name: t('styleGuide.wangWu', '王五'), status: 'draft', role: t('styleGuide.user', '普通用户') },
                    ].map((row, i) => (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          {row.status === 'active' ? (
                            <Badge variant="soft-success">{t('styleGuide.active', '活跃')}</Badge>
                          ) : row.status === 'processing' ? (
                            <Badge variant="soft-warning">{t('styleGuide.processing', '处理中')}</Badge>
                          ) : (
                            <Badge variant="soft-neutral">{t('styleGuide.draft', '草稿')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.role}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon-sm" variant="ghost"><Edit3 className="h-4 w-4" /></Button>
                            <Button size="icon-sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                            <Button size="icon-sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableComponent>
              </div>
            </Section>
            <Section title={t('styleGuide.skeleton', '骨架屏加载')}>
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="feedback">
            <Section title={t('styleGuide.alerts', '警告提示')}>
              <div className="space-y-4 max-w-2xl">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t('styleGuide.infoAlert', '信息')}</AlertTitle>
                  <AlertDescription>{t('styleGuide.infoAlertDesc', '这是一条信息提示消息。')}</AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>{t('styleGuide.errorAlert', '错误')}</AlertTitle>
                  <AlertDescription>{t('styleGuide.errorAlertDesc', '出问题了，请重试。')}</AlertDescription>
                </Alert>
              </div>
            </Section>
            <Section title={t('styleGuide.dialogs', '对话框')}>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>{t('styleGuide.openDialog', '打开对话框')}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('styleGuide.dialogTitle', '确认操作')}</DialogTitle>
                    <DialogDescription>{t('styleGuide.dialogDesc', '此操作无法撤销，确定要继续吗？')}</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">{t('styleGuide.dialogContent', '对话框内容区域放在这里。可以放置表单、确认信息或任意内容。')}</p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('styleGuide.cancel', '取消')}</Button>
                    <Button variant="destructive" onClick={() => { setDialogOpen(false); toast.success(t('styleGuide.deleted', '已删除！')); }}>{t('styleGuide.delete', '删除')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Section>
            <Section title={t('styleGuide.toasts', '消息提示')}>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => toast.success(t('styleGuide.successMsg', '操作成功'))}>{t('styleGuide.successToast', '成功提示')}</Button>
                <Button variant="outline" onClick={() => toast.error(t('styleGuide.errorMsg', '操作失败'))}>{t('styleGuide.errorToast', '错误提示')}</Button>
                <Button variant="outline" onClick={() => toast.info(t('styleGuide.infoMsg', '提示信息'))}>{t('styleGuide.infoToast', '信息提示')}</Button>
              </div>
            </Section>
            <Section title={t('styleGuide.tooltips', '文字提示')}>
              <div className="flex gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('styleGuide.settings', '设置')}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"><Bell className="h-4 w-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('styleGuide.notifications', '通知')}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"><Users className="h-4 w-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('styleGuide.users', '用户管理')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="colors">
            <Section title={t('styleGuide.semanticColorTokens', '语义化颜色 Token')} description={t('styleGuide.semanticColorTokensDesc', '基于 CSS 变量的颜色 token。切换右上角主题可查看深色模式效果。')}>
              <div className="flex flex-wrap gap-4">
                <Swatch bgClass="bg-background border" label="Background" />
                <Swatch bgClass="bg-foreground" label="Foreground" textClass="text-background" />
                <Swatch bgClass="bg-card border" label="Card" />
                <Swatch bgClass="bg-primary" label="Primary" textClass="text-primary-foreground" />
                <Swatch bgClass="bg-secondary" label="Secondary" />
                <Swatch bgClass="bg-muted" label="Muted" />
                <Swatch bgClass="bg-accent" label="Accent" />
                <Swatch bgClass="bg-destructive" label="Destructive" textClass="text-destructive-foreground" />
                <Swatch bgClass="bg-border" label="Border" />
                <Swatch bgClass="bg-input border" label="Input" />
              </div>
            </Section>
            <Alert className="border-destructive/20 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-destructive font-semibold">{t('styleGuide.forbiddenColors', '禁止：硬编码 Slate 颜色')}</AlertTitle>
              <AlertDescription className="text-sm">
                {t('styleGuide.forbiddenColorsDesc', '禁止使用 text-slate-*、bg-slate-*、border-slate-*、text-gray-*、bg-gray-* 等。这些颜色不会适配深色模式。请始终使用语义化 token（text-foreground、bg-muted、border-border）。')}
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </AdminPageTemplate>
    </TooltipProvider>
  );
}
