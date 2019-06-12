import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LyricsApiService {

  constructor(private http: HttpClient) { }

  getSongLyricsURL(song: any) {
    return this.http.get(
      'https://api.genius.com/search?q=' + encodeURI(this.formatTitle(song.title) + ' by ' + song.artist) + '&access_token=mFkorPf-Ho0KfwrU3QGdf71rl3sO3YgDMYxmxmTd-zwZSUn3vC91R_jYWlzFumRU'
    );
  }

  formatTitle(title: string) {
    let temp = title;
  
    if(title.indexOf('(') > -1) {
      temp = title.split('(')[0].trim();
    }
  
    if(title.indexOf('[') > -1) {
      temp = title.split('[')[0].trim();
    }
  
    if(title.indexOf('-') > -1) {
      temp = title.split('-')[0].trim();
    }
  
    if(title.indexOf('\'') > -1) {
      temp = title.split('\'')[0].trim();
    }
  
    return temp;
  }

  getLyrics(songURL: string) {
    return this.http.post(
      'http://jackmparker.com/spotify/php/get-lyrics.php',
      songURL
    );
  }
}
