import { TestBed } from '@angular/core/testing';

import { LyricsApiService } from './lyrics-api.service';

describe('LyricsApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: LyricsApiService = TestBed.get(LyricsApiService);
    expect(service).toBeTruthy();
  });
});
