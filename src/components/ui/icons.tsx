"use client";

import {
  AlertCircle as LucideAlertCircle,
  AlertTriangle as LucideAlertTriangle,
  ArrowDown as LucideArrowDown,
  ArrowLeft as LucideArrowLeft,
  ArrowUp as LucideArrowUp,
  ArrowUpRight as LucideArrowUpRight,
  Award as LucideAward,
  Ban as LucideBan,
  BellOff as LucideBellOff,
  BookOpen as LucideBookOpen,
  CalendarPlus as LucideCalendarPlus,
  Camera as LucideCamera,
  CheckCheck as LucideCheckCheck,
  Circle as LucideCircle,
  CircleHelp as LucideCircleHelp,
  CircleSlash2 as LucideCircleSlash2,
  Clock as LucideClock,
  Clock3 as LucideClock3,
  CreditCard as LucideCreditCard,
  Eraser as LucideEraser,
  ExternalLink as LucideExternalLink,
  FileCheck as LucideFileCheck,
  FileCheck2 as LucideFileCheck2,
  FileDown as LucideFileDown,
  FileSignature as LucideFileSignature,
  HeartPulse as LucideHeartPulse,
  History as LucideHistory,
  Image as LucideImage,
  Inbox as LucideInbox,
  Info as LucideInfo,
  Loader2 as LucideLoader2,
  Lock as LucideLock,
  MapPin as LucideMapPin,
  Megaphone as LucideMegaphone,
  Menu as LucideMenu,
  MessageCircle as LucideMessageCircle,
  Minus as LucideMinus,
  Monitor as LucideMonitor,
  MoreHorizontal as LucideMoreHorizontal,
  OctagonX as LucideOctagonX,
  Palette as LucidePalette,
  PanelLeft as LucidePanelLeft,
  Phone as LucidePhone,
  ReceiptText as LucideReceiptText,
  RefreshCw as LucideRefreshCw,
  RotateCcw as LucideRotateCcw,
  Save as LucideSave,
  Shield as LucideShield,
  Sparkles as LucideSparkles,
  Trash2 as LucideTrash2,
  TriangleAlert as LucideTriangleAlert,
  XCircle as LucideXCircle,
} from "lucide-react";

import { createAnimatedIcon, ICON_VARIANTS } from "@/components/ui/animated-icon-factory";

// Ícones com animações SVG nativas artesanais
export { ActivityIcon, ActivityIcon as Activity } from "@/components/ui/activity";
export { ArrowRightIcon, ArrowRightIcon as ArrowRight } from "@/components/ui/arrow-right";
export { BellIcon, BellIcon as Bell } from "@/components/ui/bell";
export { CalendarCheck2Icon, CalendarCheck2Icon as CalendarCheck2 } from "@/components/ui/calendar-check-2";
export {
  CalendarDaysIcon,
  CalendarDaysIcon as CalendarDays,
  CalendarDaysIcon as Calendar,
  CalendarDaysIcon as CalendarIcon,
} from "@/components/ui/calendar-days";
export { ChartLineIcon, ChartLineIcon as ChartLine } from "@/components/ui/chart-line";
export { CheckIcon, CheckIcon as Check } from "@/components/ui/check";
export { ChevronDownIcon, ChevronDownIcon as ChevronDown } from "@/components/ui/chevron-down";
export { ChevronLeftIcon, ChevronLeftIcon as ChevronLeft } from "@/components/ui/chevron-left";
export { ChevronRightIcon, ChevronRightIcon as ChevronRight } from "@/components/ui/chevron-right";
export { ChevronUpIcon, ChevronUpIcon as ChevronUp } from "@/components/ui/chevron-up";
export { ChevronsUpDownIcon, ChevronsUpDownIcon as ChevronsUpDown } from "@/components/ui/chevrons-up-down";
export {
  CircleCheckIcon,
  CircleCheckIcon as CircleCheck,
  CircleCheckIcon as CheckCircle2,
  CircleCheckIcon as CircleCheck2,
} from "@/components/ui/circle-check";
export { ClipboardCheckIcon, ClipboardCheckIcon as ClipboardCheck } from "@/components/ui/clipboard-check";
export { CopyIcon, CopyIcon as Copy } from "@/components/ui/copy";
export { DownloadIcon, DownloadIcon as Download } from "@/components/ui/download";
export { EyeOffIcon, EyeOffIcon as EyeOff } from "@/components/ui/eye-off";
export { EyeIcon, EyeIcon as Eye } from "@/components/ui/eye";
export {
  FilePenLineIcon,
  FilePenLineIcon as FilePenLine,
  FilePenLineIcon as Pencil,
} from "@/components/ui/file-pen-line";
export { FileTextIcon, FileTextIcon as FileText } from "@/components/ui/file-text";
export { FlameIcon, FlameIcon as Flame } from "@/components/ui/flame";
export {
  KeyIcon,
  KeyIcon as Key,
  KeyIcon as KeyRound,
} from "@/components/ui/key";
export { LayersIcon, LayersIcon as Layers } from "@/components/ui/layers";
export { LayoutPanelTopIcon, LayoutPanelTopIcon as LayoutPanelTop } from "@/components/ui/layout-panel-top";
export { LogoutIcon, LogoutIcon as Logout } from "@/components/ui/logout";
export { MoonIcon, MoonIcon as Moon } from "@/components/ui/moon";
export { PlusIcon, PlusIcon as Plus } from "@/components/ui/plus";
export { SearchIcon, SearchIcon as Search } from "@/components/ui/search";
export { SendIcon, SendIcon as Send } from "@/components/ui/send";
export { SettingsIcon, SettingsIcon as Settings } from "@/components/ui/settings";
export { ShieldCheckIcon, ShieldCheckIcon as ShieldCheck } from "@/components/ui/shield-check";
export { SlidersHorizontalIcon, SlidersHorizontalIcon as SlidersHorizontal } from "@/components/ui/sliders-horizontal";
export { SquarePenIcon, SquarePenIcon as SquarePen } from "@/components/ui/square-pen";
export { SunIcon, SunIcon as Sun } from "@/components/ui/sun";
export { UploadIcon, UploadIcon as Upload } from "@/components/ui/upload";
export { UserPlusIcon, UserPlusIcon as UserPlus } from "@/components/ui/user-plus";
export { UserIcon, UserIcon as User } from "@/components/ui/user";
export {
  UsersRoundIcon,
  UsersRoundIcon as UsersRound,
  UsersRoundIcon as Users,
} from "@/components/ui/users-round";
export {
  WalletIcon,
  WalletIcon as Wallet,
  WalletIcon as WalletCards,
} from "@/components/ui/wallet";
export { XIcon, XIcon as X } from "@/components/ui/x";

// Ícones animados pelo motor lucide-animated com micro-interações especializadas
export const MapPin = createAnimatedIcon(LucideMapPin, ICON_VARIANTS.pin, "MapPin");
export const Clock = createAnimatedIcon(LucideClock, ICON_VARIANTS.clock, "Clock");
export const Clock3 = createAnimatedIcon(LucideClock3, ICON_VARIANTS.clock, "Clock3");
export const History = createAnimatedIcon(LucideHistory, ICON_VARIANTS.clock, "History");
export const AlertCircle = createAnimatedIcon(LucideAlertCircle, ICON_VARIANTS.alert, "AlertCircle");
export const AlertCircleIcon = AlertCircle;
export const AlertTriangle = createAnimatedIcon(LucideAlertTriangle, ICON_VARIANTS.alert, "AlertTriangle");
export const TriangleAlert = createAnimatedIcon(LucideTriangleAlert, ICON_VARIANTS.alert, "TriangleAlert");
export const TriangleAlertIcon = TriangleAlert;
export const OctagonX = createAnimatedIcon(LucideOctagonX, ICON_VARIANTS.alert, "OctagonX");
export const OctagonXIcon = OctagonX;
export const Award = createAnimatedIcon(LucideAward, ICON_VARIANTS.award, "Award");
export const Sparkles = createAnimatedIcon(LucideSparkles, ICON_VARIANTS.award, "Sparkles");
export const Info = createAnimatedIcon(LucideInfo, ICON_VARIANTS.alert, "Info");
export const InfoIcon = Info;
export const CircleHelp = createAnimatedIcon(LucideCircleHelp, ICON_VARIANTS.alert, "CircleHelp");
export const ExternalLink = createAnimatedIcon(LucideExternalLink, ICON_VARIANTS.arrowUpRight, "ExternalLink");
export const ArrowLeft = createAnimatedIcon(LucideArrowLeft, ICON_VARIANTS.arrowLeft, "ArrowLeft");
export const ArrowLeftIcon = ArrowLeft;
export const ArrowUp = createAnimatedIcon(LucideArrowUp, ICON_VARIANTS.arrowUp, "ArrowUp");
export const ArrowUpIcon = ArrowUp;
export const ArrowDown = createAnimatedIcon(LucideArrowDown, ICON_VARIANTS.arrowDown, "ArrowDown");
export const ArrowDownIcon = ArrowDown;
export const ArrowUpRight = createAnimatedIcon(LucideArrowUpRight, ICON_VARIANTS.arrowUpRight, "ArrowUpRight");
export const CalendarPlus = createAnimatedIcon(LucideCalendarPlus, ICON_VARIANTS.check, "CalendarPlus");
export const MoreHorizontal = createAnimatedIcon(LucideMoreHorizontal, ICON_VARIANTS.default, "MoreHorizontal");
export const MoreHorizontalIcon = MoreHorizontal;
export const Loader2 = createAnimatedIcon(LucideLoader2, ICON_VARIANTS.infiniteSpin, "Loader2");
export const Loader2Icon = Loader2;
export const Eraser = createAnimatedIcon(LucideEraser, ICON_VARIANTS.eraser, "Eraser");
export const FileSignature = createAnimatedIcon(LucideFileSignature, ICON_VARIANTS.default, "FileSignature");
export const BellOff = createAnimatedIcon(LucideBellOff, ICON_VARIANTS.bellOff, "BellOff");
export const HeartPulse = createAnimatedIcon(LucideHeartPulse, ICON_VARIANTS.pulse, "HeartPulse");
export const Save = createAnimatedIcon(LucideSave, ICON_VARIANTS.save, "Save");
export const ReceiptText = createAnimatedIcon(LucideReceiptText, ICON_VARIANTS.default, "ReceiptText");
export const Trash2 = createAnimatedIcon(LucideTrash2, ICON_VARIANTS.trash, "Trash2");
export const MessageCircle = createAnimatedIcon(LucideMessageCircle, ICON_VARIANTS.message, "MessageCircle");
export const Megaphone = createAnimatedIcon(LucideMegaphone, ICON_VARIANTS.message, "Megaphone");
export const BookOpen = createAnimatedIcon(LucideBookOpen, ICON_VARIANTS.default, "BookOpen");
export const Palette = createAnimatedIcon(LucidePalette, ICON_VARIANTS.default, "Palette");
export const Shield = createAnimatedIcon(LucideShield, ICON_VARIANTS.default, "Shield");
export const Camera = createAnimatedIcon(LucideCamera, ICON_VARIANTS.camera, "Camera");
export const Image = createAnimatedIcon(LucideImage, ICON_VARIANTS.camera, "Image");
export const ImageIcon = Image;
export const Menu = createAnimatedIcon(LucideMenu, ICON_VARIANTS.default, "Menu");
export const Monitor = createAnimatedIcon(LucideMonitor, ICON_VARIANTS.default, "Monitor");
export const Inbox = createAnimatedIcon(LucideInbox, ICON_VARIANTS.arrowDown, "Inbox");
export const Minus = createAnimatedIcon(LucideMinus, ICON_VARIANTS.default, "Minus");
export const MinusIcon = Minus;
export const PanelLeft = createAnimatedIcon(LucidePanelLeft, ICON_VARIANTS.arrowLeft, "PanelLeft");
export const PanelLeftIcon = PanelLeft;
export const Lock = createAnimatedIcon(LucideLock, ICON_VARIANTS.lock, "Lock");
export const Ban = createAnimatedIcon(LucideBan, ICON_VARIANTS.alert, "Ban");
export const CircleSlash2 = createAnimatedIcon(LucideCircleSlash2, ICON_VARIANTS.spin, "CircleSlash2");
export const FileCheck = createAnimatedIcon(LucideFileCheck, ICON_VARIANTS.check, "FileCheck");
export const FileCheck2 = createAnimatedIcon(LucideFileCheck2, ICON_VARIANTS.check, "FileCheck2");
export const FileDown = createAnimatedIcon(LucideFileDown, ICON_VARIANTS.arrowDown, "FileDown");
export const CreditCard = createAnimatedIcon(LucideCreditCard, ICON_VARIANTS.default, "CreditCard");
export const CheckCheck = createAnimatedIcon(LucideCheckCheck, ICON_VARIANTS.check, "CheckCheck");
export const Circle = createAnimatedIcon(LucideCircle, ICON_VARIANTS.default, "Circle");
export const Phone = createAnimatedIcon(LucidePhone, ICON_VARIANTS.phone, "Phone");
export const RotateCcw = createAnimatedIcon(LucideRotateCcw, ICON_VARIANTS.spin, "RotateCcw");
export const RefreshCw = createAnimatedIcon(LucideRefreshCw, ICON_VARIANTS.spin, "RefreshCw");
export const XCircle = createAnimatedIcon(LucideXCircle, ICON_VARIANTS.alert, "XCircle");
