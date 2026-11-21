import { createReviewService, type ReviewService } from "@content-engine/services";

let service: ReviewService | undefined;

/** The same review service the Telegram bot uses: one write, one event, shared rules. */
export function reviews(): ReviewService {
  service ??= createReviewService();
  return service;
}
