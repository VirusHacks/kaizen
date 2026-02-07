"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type Call, useStreamVideoClient } from "@stream-io/video-react-sdk"
import { useUser } from "@clerk/nextjs"
import { Video, Users, Calendar, PlaySquare, LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import ReactDatePicker from "react-datepicker"
import MeetingModal from "./MeetingModal"
import Loader from "./Loader"

const initialValues = {
  dateTime: new Date(),
  description: "",
  link: "",
}

const MeetingTypeList = () => {
  const router = useRouter()
  const [meetingState, setMeetingState] = useState<
    "isScheduleMeeting" | "isJoiningMeeting" | "isInstantMeeting" | undefined
  >(undefined)
  const [values, setValues] = useState(initialValues)
  const [callDetail, setCallDetail] = useState<Call>()
  const client = useStreamVideoClient()
  const { user } = useUser()
  const { toast } = useToast()

  const createMeeting = async () => {
    if (!client || !user) return
    try {
      if (meetingState === "isScheduleMeeting" && !values.dateTime) {
        toast({ title: "Please select a date and time" })
        return
      }
      const id = crypto.randomUUID()
      const call = client.call("default", id)
      if (!call) throw new Error("Failed to create meeting")
      const startsAt = values.dateTime.toISOString() || new Date(Date.now()).toISOString()
      const description = values.description || "Instant Meeting"
      await call.getOrCreate({
        data: {
          starts_at: startsAt,
          custom: {
            description,
          },
        },
      })
      setCallDetail(call)
      if (!values.description) {
        router.push(`/dashboard/meeting/${call.id}`)
      }
      toast({
        title: "Meeting Created",
      })
    } catch (error) {
      console.error(error)
      toast({ title: "Failed to create Meeting" })
    }
  }

  if (!client || !user) return <Loader />

  const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/meeting/${callDetail?.id}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        <Button
          size="lg"
          className="flex items-center gap-2 bg-white hover:bg-gray-50"
          onClick={() => setMeetingState("isInstantMeeting")}
        >
          <Video className="h-5 w-5" />
          New meeting
        </Button>
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-[#111111] p-2 md:max-w-md">
          <LinkIcon className="ml-2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Enter a code or link"
            className="border-none bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-0"
            onChange={(e) => setValues({ ...values, link: e.target.value })}
          />
          <Button
            variant="ghost"
            className="text-white hover:bg-gray-50 "
            onClick={() => setMeetingState("isJoiningMeeting")}
          >
            Join
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Button
          variant="outline"
          className="flex h-[140px] flex-col items-center justify-center gap-4 rounded-lg border-[#222222] bg-[#111111] p-6 hover:bg-[#161616]"
          onClick={() => setMeetingState("isScheduleMeeting")}
        >
          <Calendar className="h-8 w-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm text-gray-400">Plan ahead for your team</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="flex h-[140px] flex-col items-center justify-center gap-4 rounded-lg border-[#222222] bg-[#111111] p-6 hover:bg-[#161616]"
          onClick={() => setMeetingState("isJoiningMeeting")}
        >
          <Users className="h-8 w-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm text-gray-400">Via invitation link</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="flex h-[140px] flex-col items-center justify-center gap-4 rounded-lg border-[#222222] bg-[#111111] p-6 hover:bg-[#161616]"
          onClick={() => router.push("/recordings")}
        >
          <PlaySquare className="h-8 w-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm text-gray-400">Access past meetings</p>
          </div>
        </Button>
      </div>

      {!callDetail ? (
        <MeetingModal
          isOpen={meetingState === "isScheduleMeeting"}
          onClose={() => setMeetingState(undefined)}
          title="Schedule Meeting"
          handleClick={createMeeting}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-400">Description</label>
              <Textarea
                className="border-[#222222] bg-[#111111] focus-visible:ring-blue-500"
                placeholder="Add meeting description"
                onChange={(e) => setValues({ ...values, description: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-400">Date and Time</label>
              <ReactDatePicker
                selected={values.dateTime}
                onChange={(date) => setValues({ ...values, dateTime: date! })}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="time"
                dateFormat="MMMM d, yyyy h:mm aa"
                className="w-full rounded-md border border-[#222222] bg-[#111111] p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </MeetingModal>
      ) : (
        <MeetingModal
          isOpen={meetingState === "isScheduleMeeting"}
          onClose={() => setMeetingState(undefined)}
          title="Meeting Created"
          handleClick={() => {
            navigator.clipboard.writeText(meetingLink)
            toast({ title: "Link Copied" })
          }}
          image="/icons/checked.svg"
          buttonIcon="/icons/copy.svg"
          className="text-center"
          buttonText="Copy Meeting Link"
        />
      )}

      <MeetingModal
        isOpen={meetingState === "isJoiningMeeting"}
        onClose={() => setMeetingState(undefined)}
        title="Join Meeting"
        buttonText="Join"
        handleClick={() => router.push(values.link)}
      >
        <Input
          placeholder="Enter meeting link"
          className="border-gray-800 bg-[#1a1a1a] focus-visible:ring-gray-200"
          onChange={(e) => setValues({ ...values, link: e.target.value })}
        />
      </MeetingModal>

      <MeetingModal
        isOpen={meetingState === "isInstantMeeting"}
        onClose={() => setMeetingState(undefined)}
        title="Start an Instant Meeting"
        className="text-center"
        buttonText="Start Meeting"
        handleClick={createMeeting}
      />
    </div>
  )
}

export default MeetingTypeList

