import { env, requireFeature } from "@content-engine/config";
import { UNIT_PRICES, type UsageRecord } from "@content-engine/core";
import type { Alignment } from "./timing";

export interface VoiceResult {
  audio: Buffer;
  alignment: Alignment;
  durationSec: number;
  usage: Omit<UsageRecord, "trendId">;
}

export class VoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceError";
  }
}

/** Speaks the narration in the cloned voice and returns MP3 audio plus per-character timings. */
export async function synthesizeVoice(text: string): Promise<VoiceResult> {
  const keys = requireFeature("voice");
  const startedAt = Date.now();
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(keys.ELEVENLABS_VOICE_ID)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": keys.ELEVENLABS_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: env().ELEVENLABS_MODEL_ID,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) throw new VoiceError(`ElevenLabs ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const body = (await response.json()) as { audio_base64?: string; alignment?: Alignment | null };
  if (!body.audio_base64 || !body.alignment) throw new VoiceError("ElevenLabs returned no audio or timings");

  return {
    audio: Buffer.from(body.audio_base64, "base64"),
    alignment: body.alignment,
    durationSec: body.alignment.character_end_times_seconds.at(-1) ?? 0,
    usage: {
      provider: "elevenlabs",
      stage: "voice",
      model: env().ELEVENLABS_MODEL_ID,
      promptVersion: null,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      units: text.length,
      costUsd: text.length * UNIT_PRICES.voiceCharacter,
      latencyMs: Date.now() - startedAt,
    },
  };
}
