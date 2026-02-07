import MeetingTypeList from "@/components/MeetingTypeList"

const Home = () => {
  return (
    <main className="flex min-h-screen flex-col bg-[#0A0A0A] px-4 py-8 text-white md:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-12 max-w-2xl">
          <h1 className="mb-4 text-4xl font-medium leading-tight md:text-5xl">Video calls and meetings for everyone</h1>
          <p className="text-lg text-gray-400">Connect, collaborate and celebrate from anywhere with Fuzzie Meet</p>
        </div>
        <MeetingTypeList />
      </div>
    </main>
  )
}

export default Home