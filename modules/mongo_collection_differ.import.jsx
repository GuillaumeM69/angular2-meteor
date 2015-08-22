import {ChangeDetectorRef} from 'angular2/angular2';
import {ObservableWrapper, DefaultIterableDifferFactory, CollectionChangeRecord} from 'angular2/change_detection';
import {MongoCollectionObserver, AddChange, MoveChange, RemoveChange} from './mongo_collection_observer';

export class MongoCollectionDifferFactory extends DefaultIterableDifferFactory {
  supports(obj: Object): boolean { return obj instanceof MongoCollectionObserver; }

  create(cdRef: ChangeDetectorRef): MongoCollectionDiffer {
    return new MongoCollectionDiffer(cdRef);
  }
}

export class MongoCollectionDiffer {
  _inserted: Array<CollectionChangeRecord>;
  _removed: Array<CollectionChangeRecord>;
  _moved: Array<CollectionChangeRecord>;
  _observer: MongoCollectionObserver;
  _lastChanges: Array<AddChange|MoveChange|RemoveChange>;

  constructor(cdRef: ChangeDetectorRef) {
    this._inserted = [];
    this._removed = [];
    this._moved = [];
    this._observer = null;;
    this._lastChanges = [];
  }

  forEachAddedItem(fn: Function) {
    for (var i = 0; i < this._inserted.length; i++) {
      fn(this._inserted[i]);
    }
  }

  forEachMovedItem(fn: Function) {
    for (var i = 0; i < this._moved.length; i++) {
      fn(this._moved[i]);
    }
  }

  forEachRemovedItem(fn: Function) {
    for (var i = 0; i < this._removed.length; i++) {
      fn(this._removed[i]);
    }
  }

  diff(observer: MongoCollectionObserver) {
    this._reset();

    if (this._observer !== observer) {
      var self = this;
      if (this._subscription) {
        ObservableWrapper.dispose(this._subscription);
      }
      this._subscription = ObservableWrapper.subscribe(observer,
        changes => {
          self._updateLatestValue(changes);
        });
      this._observer = observer;
      this._lastChanges =this._observer.lastChanges
    }

    if (this._lastChanges) {
      this._applyChanges(this._lastChanges);
      this._lastChanges = null;
      return this;
    }

    return null;
  }

  _updateLatestValue(changes) {
    this._lastChanges = changes;
  }

  _reset() {
    this._inserted.length = 0;
    this._moved.length = 0;
    this._removed.length = 0;
  }

  _applyChanges(changes) {
    for (var i = 0; i < changes.length; i++) {
      if (changes[i] instanceof AddChange) {
        this._inserted.push(this._createChangeRecord(
          changes[i].index, null, changes[i].item));
      }
      if (changes[i] instanceof MoveChange) {
        this._moved.push(this._createChangeRecord(
          changes[i].toIndex, changes[i].fromIndex, changes[i].item));
      }
      if (changes[i] instanceof RemoveChange) {
        this._removed.push(this._createChangeRecord(
          null, changes[i].index, changes[i].item));
      }
    }
  }

  _createChangeRecord(currentIndex, prevIndex, item) {
    var record = new CollectionChangeRecord(item);
    record.currentIndex = currentIndex;
    record.previousIndex = prevIndex;
    return record;
  }
}