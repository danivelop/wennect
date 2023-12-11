import { useState, useEffect } from 'react'
import { merge } from 'rxjs'
import { map } from 'rxjs/operators'

import useRemoteParticipants from '@/hooks/useRemoteParticipants'

function useRemoteMediaStream() {
  const [remoteMediaStreamList, setRemoteMediaStreamList] = useState<
    MediaStream[]
  >([])

  const remoteParticipants = useRemoteParticipants()

  useEffect(() => {
    const subscription = merge(
      ...remoteParticipants.map(
        (remoteParticipant) => remoteParticipant.mediaStreamList$,
      ),
    )
      .pipe(
        map(() =>
          remoteParticipants
            .map(
              (remoteParticipant) => remoteParticipant.mediaStreamList$.value,
            )
            .reduce((acc, cur) => [...acc, ...cur], []),
        ),
      )
      .subscribe(setRemoteMediaStreamList)

    return () => {
      subscription.unsubscribe()
    }
  }, [remoteParticipants])

  return {
    remoteMediaStreamList,
  }
}

export default useRemoteMediaStream
