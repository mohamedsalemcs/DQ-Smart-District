import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * TD-10 — حدود الخطأ.
 * بلا هذه الحدود، فشل أصل واحد (نموذج 3D مثلًا) يُسقط التطبيق كله
 * إلى شاشة بيضاء. الفشل يجب أن يبقى محصورًا في المنطقة التي فشلت.
 *
 * القاعدة P4: الرسالة تقول ما حدث وما الخطوة التالية — لا تعتذر ولا تلوم.
 */

interface Props {
  children: ReactNode;
  /** ما الذي فشل — يظهر للمستخدم */
  labelAr: string;
  /** بديل مصغّر بدل البطاقة الكاملة */
  compact?: boolean;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.labelAr}]`, error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isAsset = /fetch|404|load|network/i.test(error.message);

    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center gap-3 rounded-card border border-warn-500/25 bg-warn-50 text-center ${
          this.props.compact ? 'p-5' : 'min-h-[240px] p-8'
        }`}
      >
        <span className="flex size-11 items-center justify-center rounded-pill bg-warn-600/10 text-warn-600">
          <AlertTriangle size={20} aria-hidden />
        </span>

        <div>
          <p className="text-body font-semibold text-ink-900">
            تعذّر عرض {this.props.labelAr}
          </p>
          <p className="mt-1.5 max-w-md text-caption leading-relaxed text-ink-600">
            {isAsset
              ? 'لم يتحمّل أحد الأصول المطلوبة. بقية الشاشة تعمل بشكل طبيعي.'
              : 'حدث خلل في هذا الجزء. بقية الشاشة تعمل بشكل طبيعي.'}
          </p>
        </div>

        <button
          onClick={this.reset}
          className="inline-flex h-9 items-center gap-2 rounded-ctl bg-ink-0 px-4 text-caption font-semibold text-ink-800 ring-1 ring-ink-200 transition-colors hover:bg-ink-50"
        >
          <RotateCcw size={14} aria-hidden />
          إعادة المحاولة
        </button>

        <details className="mt-1 w-full max-w-lg text-start">
          <summary className="cursor-pointer text-micro text-ink-500">تفاصيل تقنية</summary>
          <pre
            dir="ltr"
            className="mt-2 overflow-x-auto rounded-ctl bg-ink-0 p-3 text-start text-micro text-ink-600 ring-1 ring-ink-100"
          >
            {error.message}
          </pre>
        </details>
      </div>
    );
  }
}
