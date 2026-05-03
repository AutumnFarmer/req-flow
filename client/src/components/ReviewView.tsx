import { useState } from 'react';
import { submitReview } from '../api';
import { useAppStore } from '../store';
import type { ReviewRecord, ReviewStatus } from '../types';

export default function ReviewView({ reviews }: { reviews: ReviewRecord[] }) {
  const session = useAppStore((s) => s.session);
  const actor = useAppStore((s) => s.actor);
  const setSession = useAppStore((s) => s.setSession);
  const setError = useAppStore((s) => s.setError);
  const [role, setRole] = useState('业务负责人');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState<ReviewStatus | null>(null);

  if (!session) return null;

  const currentReviews = reviews.filter((review) => review.version === session.currentVersion);
  const latestReviews = [...reviews].reverse();

  const handleSubmit = async (status: ReviewStatus) => {
    if (submitting) return;
    setSubmitting(status);
    try {
      const updated = await submitReview(
        session.id,
        status,
        comment.trim() || (status === 'approved' ? '当前版本可以冻结' : '需要按评审意见调整后重新提交'),
        role,
      );
      setSession(updated);
      setComment('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="p-5 space-y-5">
      <section className="rounded-md border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">当前版本评审</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              冻结规格包前，需要当前版本至少一条通过记录；当前版本被打回时不能冻结。
            </p>
          </div>
          <span className="rounded-md border border-white/10 bg-[#080b10] px-2 py-1 text-xs text-gray-400">
            v{session.currentVersion}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 max-lg:grid-cols-1">
          <label className="space-y-1">
            <span className="text-[11px] text-gray-500">评审人</span>
            <div className="rounded-md border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-gray-300">
              {actor}
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-gray-500">角色</span>
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-gray-100 focus:border-cyan-400/50 focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-gray-500">当前版本记录</span>
            <div className="rounded-md border border-white/10 bg-[#080b10] px-3 py-2 text-xs text-gray-300">
              通过 {currentReviews.filter((item) => item.status === 'approved').length} / 打回 {currentReviews.filter((item) => item.status === 'rejected').length}
            </div>
          </label>
        </div>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="填写评审意见、风险说明或打回原因"
          className="mt-3 h-24 w-full resize-none rounded-md border border-white/10 bg-[#080b10] px-3 py-2 text-xs leading-5 text-gray-100 placeholder-gray-600 focus:border-cyan-400/50 focus:outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleSubmit('approved')}
            disabled={!!submitting}
            className="rounded-md bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting === 'approved' ? '提交中...' : '评审通过'}
          </button>
          <button
            onClick={() => handleSubmit('rejected')}
            disabled={!!submitting}
            className="rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/15 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting === 'rejected' ? '提交中...' : '打回修改'}
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">评审记录</h3>
        {latestReviews.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">
            暂无评审记录
          </div>
        ) : (
          <div className="space-y-2">
            {latestReviews.map((review) => (
              <div key={review.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-sm font-medium text-gray-200">
                    v{review.version} · {review.actor}
                  </div>
                  <span className={`rounded-md px-2 py-1 text-[11px] ${
                    review.status === 'approved'
                      ? 'bg-emerald-400/10 text-emerald-200'
                      : 'bg-rose-400/10 text-rose-200'
                  }`}>
                    {review.status === 'approved' ? '通过' : '打回'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {review.role} · {new Date(review.createdAt).toLocaleString('zh-CN')}
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-400">{review.comment || '无备注'}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
