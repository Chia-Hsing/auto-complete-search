import * as domUtils from './dom-utils';
import * as dataUtils from './data-utils';
import { fromEvent, map, switchMap, debounceTime, distinctUntilChanged, filter } from 'rxjs';

const keywordInput = document.querySelector('#keyword') as HTMLInputElement;
const keyword$ = fromEvent(keywordInput, 'input').pipe(map((e) => (e.target as HTMLInputElement).value));

keyword$
    .pipe(
        debounceTime(700),
        distinctUntilChanged(),
        filter((keyword) => keyword.length > 3),
        switchMap((keyword) => dataUtils.getSuggestions(keyword))
    )
    .subscribe((suggestions) => {
        domUtils.fillAutoSuggestions(suggestions);
    });
