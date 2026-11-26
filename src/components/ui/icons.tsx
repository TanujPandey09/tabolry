import type { ComponentType } from "react";
import type { IconProps } from "@solar-icons/react/lib/types";

// ============================================================================
// Solar Icons V2 — Three-Style System
// 1. BoldDuotone : Brand focal points, hero/KPI highlights, active status
// 2. Broken      : Secondary cards, section headers, supporting metadata
// 3. Linear      : Crisp small inline controls (arrows, inputs, toggles)
// ============================================================================

// Style 1: Bold Duotone (Primary focal / hero / KPI / brand accents)
import {
  Bag4Icon as BoldDuotoneBag4,
  BoltIcon as BoldDuotoneBolt,
  CardIcon as BoldDuotoneCard,
  Chart2Icon as BoldDuotoneChart2,
  CheckCircleIcon as BoldDuotoneCheckCircle,
  ForkKnifeIcon as BoldDuotoneForkKnife,
  GraphNewUpIcon as BoldDuotoneGraphNewUp,
  PaletteIcon as BoldDuotonePalette,
  QrCodeIcon as BoldDuotoneQrCode,
  ShieldCheckIcon as BoldDuotoneShieldCheck,
  ShopIcon as BoldDuotoneShop,
  StarsIcon as BoldDuotoneStars,
  Widget5Icon as BoldDuotoneWidget5,
} from "@solar-icons/react/bold-duotone";

// Style 2: Broken (Secondary cards, section headers, empty states, status)
import {
  BellIcon as BrokenBell,
  BillListIcon as BrokenBillList,
  Book2Icon as BrokenBook2,
  BookmarkCheckIcon as BrokenBookmarkCheck,
  BookmarkIcon as BrokenBookmark,
  Buildings2Icon as BrokenBuildings2,
  CalendarIcon as BrokenCalendar,
  Chair2Icon as BrokenChair2,
  ChefHatIcon as BrokenChefHat,
  ClockCircleIcon as BrokenClockCircle,
  CloseCircleIcon as BrokenCloseCircle,
  CloudUploadIcon as BrokenCloudUpload,
  DangerCircleIcon as BrokenDangerCircle,
  DangerTriangleIcon as BrokenDangerTriangle,
  Folder2Icon as BrokenFolder2,
  ForbiddenCircleIcon as BrokenForbiddenCircle,
  GalleryIcon as BrokenGallery,
  GlobalIcon as BrokenGlobal,
  InfoCircleIcon as BrokenInfoCircle,
  KeyIcon as BrokenKey,
  LetterIcon as BrokenLetter,
  MapPointIcon as BrokenMapPoint,
  PhoneRoundedIcon as BrokenPhoneRounded,
  Printer2Icon as BrokenPrinter2,
  ScannerIcon as BrokenScanner,
  SettingsIcon as BrokenSettings,
  ShareIcon as BrokenShare,
  ShieldIcon as BrokenShield,
  SmartphoneIcon as BrokenSmartphone,
  UserIcon as BrokenUser,
  UsersGroupRoundedIcon as BrokenUsersGroupRounded,
} from "@solar-icons/react/broken";

// Style 3: Linear (Crisp small inline UI controls, arrows, form actions)
import {
  AddIcon as LinearAdd,
  AltArrowDownIcon as LinearAltArrowDown,
  AltArrowRightIcon as LinearAltArrowRight,
  ArrowDownIcon as LinearArrowDown,
  ArrowLeftIcon as LinearArrowLeft,
  ArrowRightIcon as LinearArrowRight,
  ArrowUpIcon as LinearArrowUp,
  CheckIcon as LinearCheck,
  CheckReadIcon as LinearCheckRead,
  CloseIcon as LinearClose,
  CopyIcon as LinearCopy,
  DisketteIcon as LinearDiskette,
  DownloadMinimalisticIcon as LinearDownloadMinimalistic,
  EyeClosedIcon as LinearEyeClosed,
  EyeIcon as LinearEye,
  FileDownloadIcon as LinearFileDownload,
  FilterIcon as LinearFilter,
  HamburgerMenuIcon as LinearHamburgerMenu,
  Logout2Icon as LinearLogout2,
  MagnifierIcon as LinearMagnifier,
  MinusIcon as LinearMinus,
  Pen2Icon as LinearPen2,
  RefreshIcon as LinearRefresh,
  RestartIcon as LinearRestart,
  RupeeIcon as LinearRupee,
  SquareTopDownIcon as LinearSquareTopDown,
  StreetsNavigationIcon as LinearStreetsNavigation,
  TrashBinTrashIcon as LinearTrashBinTrash,
  Tuning2Icon as LinearTuning2,
  VolumeCrossIcon as LinearVolumeCross,
  VolumeLoudIcon as LinearVolumeLoud,
} from "@solar-icons/react/linear";

export type AppIcon = ComponentType<IconProps>;
export type { IconProps };

// Bold Duotone exports
export const BarChart3 = BoldDuotoneChart2;
export const CheckCircle2 = BoldDuotoneCheckCircle;
export const CreditCard = BoldDuotoneCard;
export const LayoutDashboard = BoldDuotoneWidget5;
export const Palette = BoldDuotonePalette;
export const QrCode = BoldDuotoneQrCode;
export const ShieldCheck = BoldDuotoneShieldCheck;
export const ShoppingBag = BoldDuotoneBag4;
export const Sparkles = BoldDuotoneStars;
export const Store = BoldDuotoneShop;
export const TrendingUp = BoldDuotoneGraphNewUp;
export const UtensilsCrossed = BoldDuotoneForkKnife;
export const Zap = BoldDuotoneBolt;

// Broken exports
export const AlertCircle = BrokenDangerCircle;
export const AlertTriangle = BrokenDangerTriangle;
export const Ban = BrokenForbiddenCircle;
export const Bell = BrokenBell;
export const BookOpen = BrokenBook2;
export const Bookmark = BrokenBookmark;
export const BookmarkCheck = BrokenBookmarkCheck;
export const Building2 = BrokenBuildings2;
export const Calendar = BrokenCalendar;
export const Clock = BrokenClockCircle;
export const FolderTree = BrokenFolder2;
export const Globe = BrokenGlobal;
export const Image = BrokenGallery;
export const Info = BrokenInfoCircle;
export const KeyRound = BrokenKey;
export const Mail = BrokenLetter;
export const MapPin = BrokenMapPoint;
export const Phone = BrokenPhoneRounded;
export const Printer = BrokenPrinter2;
export const Receipt = BrokenBillList;
export const ScanLine = BrokenScanner;
export const Settings = BrokenSettings;
export const Share2 = BrokenShare;
export const Shield = BrokenShield;
export const Smartphone = BrokenSmartphone;
export const Table2 = BrokenChair2;
export const Upload = BrokenCloudUpload;
export const User = BrokenUser;
export const Users = BrokenUsersGroupRounded;
export const Utensils = BrokenChefHat;
export const XCircle = BrokenCloseCircle;

// Linear exports
export const ArrowDown = LinearArrowDown;
export const ArrowLeft = LinearArrowLeft;
export const ArrowRight = LinearArrowRight;
export const ArrowUp = LinearArrowUp;
export const Check = LinearCheck;
export const CheckCheck = LinearCheckRead;
export const ChevronDown = LinearAltArrowDown;
export const ChevronRight = LinearAltArrowRight;
export const Copy = LinearCopy;
export const Download = LinearDownloadMinimalistic;
export const ExternalLink = LinearSquareTopDown;
export const Eye = LinearEye;
export const EyeOff = LinearEyeClosed;
export const FileDown = LinearFileDownload;
export const Filter = LinearFilter;
export const IndianRupee = LinearRupee;
export const Loader2 = LinearRefresh;
export const LogOut = LinearLogout2;
export const Menu = LinearHamburgerMenu;
export const Minus = LinearMinus;
export const Navigation = LinearStreetsNavigation;
export const Pencil = LinearPen2;
export const Plus = LinearAdd;
export const RefreshCw = LinearRestart;
export const Save = LinearDiskette;
export const Search = LinearMagnifier;
export const SlidersHorizontal = LinearTuning2;
export const Trash2 = LinearTrashBinTrash;
export const Volume2 = LinearVolumeLoud;
export const VolumeX = LinearVolumeCross;
export const X = LinearClose;
